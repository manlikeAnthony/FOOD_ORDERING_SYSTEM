const Task = require("../models/Task");
const sendEmail = require("./sendEmail");
const cron = require("node-cron");

cron.schedule("* * * * *", async () => {
  const now = new Date(Date.now());
  const tasks = await Task.find({ date : { $lte: now }, notified: false });
  for (const task of tasks) {
    const message = `Reminder : your task "${task.title}" is due now`;
    await sendEmail({ to: task.email, subject: "Task Reminder",html: message });
    task.notified = true;
    task.archived = true;
    await task.save();
  }
});
