using System;
using System.ComponentModel.DataAnnotations;

namespace MiniProjectManager.Models
{
    public class TaskItem
    {
        public Guid Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        public DateTime? DueDate { get; set; }

        public bool IsCompleted { get; set; } = false;

        // Foreign key to the project
        [Required]
        public Guid ProjectId { get; set; }

        // Navigation property to the project
        public Project? Project { get; set; }
    }
}

