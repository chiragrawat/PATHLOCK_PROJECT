using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace MiniProjectManager.DTOs
{
    public class CreateProjectDto
    {
        [Required]
        [StringLength(100, MinimumLength = 3)]
        public string Title { get; set; } = string.Empty;

        [StringLength(500)]
        public string? Description { get; set; }
    }

    public class ProjectDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime CreationDate { get; set; }
        public int TaskCount { get; set; }
        public int CompletedTaskCount { get; set; }
    }

    public class ProjectDetailDto : ProjectDto
    {
        public List<TaskItemDto> Tasks { get; set; } = new List<TaskItemDto>();
    }
}

