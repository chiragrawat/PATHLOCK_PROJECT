using BasicTaskManager.Models;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173", "http://localhost:3000") // Allow common React dev ports
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Use the CORS policy
app.UseCors("AllowReactApp");

// --- In-Memory Database ---
var tasks = new List<TaskItem>
{
    new TaskItem { Id = Guid.NewGuid(), Description = "Learn .NET 8", IsCompleted = false },
    new TaskItem { Id = Guid.NewGuid(), Description = "Build React App", IsCompleted = false },
    new TaskItem { Id = Guid.NewGuid(), Description = "Implement API", IsCompleted = true }
};

// --- API Endpoints ---

// GET /api/tasks
app.MapGet("/api/tasks", () => {
    return Results.Ok(tasks);
});

// POST /api/tasks
app.MapPost("/api/tasks", ([FromBody] TaskItemRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest("Description is required.");
    }
    
    var task = new TaskItem
    {
        Id = Guid.NewGuid(),
        Description = request.Description,
        IsCompleted = false
    };

    tasks.Add(task);
    return Results.Created($"/api/tasks/{task.Id}", task);
});

// PUT /api/tasks/{id}
app.MapPut("/api/tasks/{id}", ([FromRoute] Guid id) =>
{
    var task = tasks.FirstOrDefault(t => t.Id == id);
    if (task == null)
    {
        return Results.NotFound();
    }
    
    task.IsCompleted = !task.IsCompleted;
    return Results.NoContent();
});

// DELETE /api/tasks/{id}
app.MapDelete("/api/tasks/{id}", ([FromRoute] Guid id) =>
{
    var task = tasks.FirstOrDefault(t => t.Id == id);
    if (task == null)
    {
        return Results.NotFound();
    }
    
    tasks.Remove(task);
    return Results.NoContent();
});

app.Run();

// DTO for the POST request
public class TaskItemRequest
{
    public string Description { get; set; } = string.Empty;
}
