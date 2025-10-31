using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiniProjectManager.DTOs;
using MiniProjectManager.Services;
using System;
using System.Threading.Tasks;

namespace MiniProjectManager.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/v1/projects")] // Using v1 as per spec
    public class SchedulerController : ControllerBase
    {
        private readonly SchedulerService _schedulerService;

        public SchedulerController(SchedulerService schedulerService)
        {
            _schedulerService = schedulerService;
        }

        // POST /api/v1/projects/{projectId}/schedule
        [HttpPost("{projectId}/schedule")]
        public ActionResult<ScheduleResponseDto> GetSchedule(Guid projectId, ScheduleRequestDto request)
        {
            // Note: In a real app, we'd validate the projectId and user ownership first
            // For this assignment, we just focus on the scheduling logic
            
            var recommendedOrder = _schedulerService.GetRecommendedTaskOrder(request.Tasks);

            var response = new ScheduleResponseDto
            {
                RecommendedOrder = recommendedOrder
            };

            return Ok(response);
        }
    }
}

