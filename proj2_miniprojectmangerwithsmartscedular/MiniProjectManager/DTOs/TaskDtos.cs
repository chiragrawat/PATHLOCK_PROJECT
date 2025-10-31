using System;
using System.ComponentModel.DataAnnotations;

namespace MiniProjectManager.DTOs
{
    public class CreateTaskDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
    }

    public class UpdateTaskDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public bool IsCompleted { get; set; }
    }

    public class TaskItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public bool IsCompleted { get; set; }
        public Guid ProjectId { get; set; }
    }
}

