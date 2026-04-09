"use client";

import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";

export function AppToastProvider() {
  return (
    <ToastContainer
      autoClose={5000}
      closeOnClick
      draggable={false}
      hideProgressBar={false}
      newestOnTop
      pauseOnFocusLoss={false}
      pauseOnHover
      position="top-right"
      theme="colored"
    />
  );
}
