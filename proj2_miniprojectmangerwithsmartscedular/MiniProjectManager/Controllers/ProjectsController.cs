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
    [Authorize] // All endpoints in this controller require authentication
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ProjectsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        // Helper to get current user ID
        private string GetUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

        // GET /api/projects
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProjectDto>>> GetProjects()
        {
            var userId = GetUserId();
            var projects = await _context.Projects
                .Where(p => p.ApplicationUserId == userId)
                .Select(p => new ProjectDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Description = p.Description,
                    CreationDate = p.CreationDate,
                    TaskCount = p.Tasks.Count(),
                    CompletedTaskCount = p.Tasks.Count(t => t.IsCompleted)
                })
                .ToListAsync();
            
            return Ok(projects);
        }

        // POST /api/projects
        [HttpPost]
        public async Task<ActionResult<ProjectDto>> CreateProject(CreateProjectDto createProjectDto)
        {
            var userId = GetUserId();
            var project = new Project
            {
                Id = Guid.NewGuid(),
                Title = createProjectDto.Title,
                Description = createProjectDto.Description,
                CreationDate = DateTime.UtcNow,
                ApplicationUserId = userId
            };

            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var projectDto = new ProjectDto
            {
                Id = project.Id,
                Title = project.Title,
                Description = project.Description,
                CreationDate = project.CreationDate,
                TaskCount = 0,
                CompletedTaskCount = 0
            };

            return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, projectDto);
        }

        // GET /api/projects/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<ProjectDetailDto>> GetProjectById(Guid id)
        {
            var userId = GetUserId();
            var project = await _context.Projects
                .Include(p => p.Tasks) // Load the tasks
                .Where(p => p.ApplicationUserId == userId && p.Id == id)
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound();
            }

            var projectDetailDto = new ProjectDetailDto
            {
                Id = project.Id,
                Title = project.Title,
                Description = project.Description,
                CreationDate = project.CreationDate,
                TaskCount = project.Tasks.Count(),
                CompletedTaskCount = project.Tasks.Count(t => t.IsCompleted),
                Tasks = project.Tasks.Select(t => new TaskItemDto
                {
                    Id = t.Id,
                    Title = t.Title,
                    DueDate = t.DueDate,
                    IsCompleted = t.IsCompleted,
                    ProjectId = t.ProjectId
                }).ToList()
            };

            return Ok(projectDetailDto);
        }

        // DELETE /api/projects/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(Guid id)
        {
            var userId = GetUserId();
            var project = await _context.Projects
                .Where(p => p.ApplicationUserId == userId && p.Id == id)
                .FirstOrDefaultAsync();

            if (project == null)
            {
                return NotFound();
            }

            // Deleting the project will also delete its tasks due to OnDelete.Cascade
            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();

            return NoContent(); // Success
        }
    }
}

