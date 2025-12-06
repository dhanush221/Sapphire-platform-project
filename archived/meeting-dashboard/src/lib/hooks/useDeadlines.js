import { useState, useEffect } from "react";
import api from "../api";

export const useDeadlines = () => {
  const [deadlines, setDeadlines] = useState([]);

  useEffect(() => {
    api.getDeadlines().then(setDeadlines);
  }, []);

  return deadlines;
};
