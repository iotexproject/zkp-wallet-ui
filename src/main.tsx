import React from "react";
import App from "./App";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
