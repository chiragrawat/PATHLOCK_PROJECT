using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MiniProjectManager.DTOs
{
    public class ScheduleRequestDto
    {
        public List<ScheduleTaskInput> Tasks { get; set; } = new List<ScheduleTaskInput>();
    }

    public class ScheduleTaskInput
    {
        [Required]
        public string Title { get; set; } = string.Empty;
        public int EstimatedHours { get; set; }
        public DateTime? DueDate { get; set; }
        public List<string> Dependencies { get; set; } = new List<string>();
    }

    public class ScheduleResponseDto
    {
        public List<string> RecommendedOrder { get; set; } = new List<string>();
    }
}

