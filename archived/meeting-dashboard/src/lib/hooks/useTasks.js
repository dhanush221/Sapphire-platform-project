import { useState, useEffect } from "react";
import api from "../api";

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    api.getTasks().then(setTasks);
  }, []);

  return tasks;
};
