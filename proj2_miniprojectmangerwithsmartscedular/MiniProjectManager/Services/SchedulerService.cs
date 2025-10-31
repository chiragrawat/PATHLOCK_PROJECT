using MiniProjectManager.DTOs;
using System.Collections.Generic;
using System.Linq;

namespace MiniProjectManager.Services
{
    // Service to handle the logic for the Smart Scheduler
    public class SchedulerService
    {
        // This is a "Topological Sort" algorithm
        public List<string> GetRecommendedTaskOrder(List<ScheduleTaskInput> tasks)
        {
            var adjacencyList = new Dictionary<string, List<string>>();
            var inDegree = new Dictionary<string, int>();
            var allTaskTitles = new HashSet<string>();

            // Initialize dictionaries for all tasks
            foreach (var task in tasks)
            {
                var title = task.Title;
                allTaskTitles.Add(title);
                if (!adjacencyList.ContainsKey(title))
                {
                    adjacencyList[title] = new List<string>();
                }
                if (!inDegree.ContainsKey(title))
                {
                    inDegree[title] = 0;
                }
            }

            // Build the graph (adjacency list) and in-degree counts
            foreach (var task in tasks)
            {
                var fromTask = task.Title;
                foreach (var depTitle in task.Dependencies)
                {
                    // Ensure the dependency exists as a task
                    if (allTaskTitles.Contains(depTitle))
                    {
                        // depTitle is a prerequisite (B) for fromTask (A)
                        // So, the edge goes from B -> A
                        if (adjacencyList.ContainsKey(depTitle) && !adjacencyList[depTitle].Contains(fromTask))
                        {
                            adjacencyList[depTitle].Add(fromTask);
                            inDegree[fromTask]++;
                        }
                    }
                }
            }

            // Initialize the queue with tasks that have no dependencies (in-degree of 0)
            var queue = new Queue<string>();
            foreach (var taskTitle in inDegree.Keys)
            {
                if (inDegree[taskTitle] == 0)
                {
                    queue.Enqueue(taskTitle);
                }
            }

            var sortedOrder = new List<string>();
            while (queue.Count > 0)
            {
                var currentTask = queue.Dequeue();
                sortedOrder.Add(currentTask);

                // Go through all neighbors (tasks that depend on this one)
                if (adjacencyList.ContainsKey(currentTask))
                {
                    foreach (var neighbor in adjacencyList[currentTask])
                    {
                        // "Remove" the edge by decrementing the in-degree
                        inDegree[neighbor]--;
                        
                        // If the neighbor now has no other dependencies, add it to the queue
                        if (inDegree[neighbor] == 0)
                        {
                            queue.Enqueue(neighbor);
                        }
                    }
                }
            }

            // If the sorted list doesn't contain all tasks, there's a cycle
            if (sortedOrder.Count != allTaskTitles.Count)
            {
                // Handle cycle: just return the remaining tasks unsorted at the end
                // A more robust solution might throw an error
                var remaining = allTaskTitles.Except(sortedOrder);
                sortedOrder.AddRange(remaining);
            }

            return sortedOrder;
        }
    }
}

