using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniProjectManager.Data;
using MiniProjectManager.DTOs;
using MiniProjectManager.Models;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace MiniProjectManager.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api")] // Note: Route is different to match spec
    public class TasksController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public TasksController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // Helper to get current user ID
        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // Helper to check if user owns the project
        private async Task<bool> UserOwnsProject(Guid projectId)
        {
            var userId = GetUserId();
            return await _context.Projects.AnyAsync(p => p.Id == projectId && p.ApplicationUserId == userId);
        }

        // POST /api/projects/{projectId}/tasks
        [HttpPost("projects/{projectId}/tasks")]
        public async Task<ActionResult<TaskItemDto>> CreateTask(Guid projectId, CreateTaskDto createTaskDto)
        {
            if (!await UserOwnsProject(projectId))
            {
                return Forbid(); // User doesn't own this project
            }

            var task = new TaskItem
            {
                Id = Guid.NewGuid(),
                Title = createTaskDto.Title,
                DueDate = createTaskDto.DueDate,
                IsCompleted = false,
                ProjectId = projectId
            };

            _context.TaskItems.Add(task);
            await _context.SaveChangesAsync();

            var taskDto = new TaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                DueDate = task.DueDate,
                IsCompleted = task.IsCompleted,
                ProjectId = task.ProjectId
            };

            return CreatedAtAction(nameof(GetTaskById), new { taskId = task.Id }, taskDto);
        }

        // GET /api/tasks/{taskId} - Helper for CreatedAtAction, not in spec but good practice
        [HttpGet("tasks/{taskId}", Name = "GetTaskById")]
        public async Task<ActionResult<TaskItemDto>> GetTaskById(Guid taskId)
        {
            var userId = GetUserId();
            var task = await _context.TaskItems
                .Where(t => t.Id == taskId)
                .FirstOrDefaultAsync();

            if (task == null) return NotFound();

            if (!await UserOwnsProject(task.ProjectId))
            {
                return Forbid();
            }

             var taskDto = new TaskItemDto
            {
                Id = task.Id,
                Title = task.Title,
                DueDate = task.DueDate,
                IsCompleted = task.IsCompleted,
                ProjectId = task.ProjectId
            };
            
            return Ok(taskDto);
        }


        // PUT /api/tasks/{taskId}
        [HttpPut("tasks/{taskId}")]
        public async Task<IActionResult> UpdateTask(Guid taskId, UpdateTaskDto updateTaskDto)
        {
            var userId = GetUserId();
            var task = await _context.TaskItems
                .Where(t => t.Id == taskId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound();
            }

            if (!await UserOwnsProject(task.ProjectId))
            {
                return Forbid();
            }

            task.Title = updateTaskDto.Title;
            task.DueDate = updateTaskDto.DueDate;
            task.IsCompleted = updateTaskDto.IsCompleted;

            _context.Entry(task).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE /api/tasks/{taskId}
        [HttpDelete("tasks/{taskId}")]
        public async Task<IActionResult> DeleteTask(Guid taskId)
        {
            var userId = GetUserId();
            var task = await _context.TaskItems
                .Where(t => t.Id == taskId)
                .FirstOrDefaultAsync();

            if (task == null)
            {
                return NotFound();
            }

            if (!await UserOwnsProject(task.ProjectId))
            {
                return Forbid();
            }

            _context.TaskItems.Remove(task);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}

