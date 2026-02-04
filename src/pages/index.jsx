import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

// ✅ Lazy load de todas las páginas para reducir el bundle inicial
const Quizzes = lazy(() => import("./Quizzes"));
const AdminProgress = lazy(() => import("./AdminProgress"));
const Badges = lazy(() => import("./Badges"));
const GamePlay = lazy(() => import("./GamePlay"));
const MyTasks = lazy(() => import("./MyTasks"));
const AdminTasks = lazy(() => import("./AdminTasks"));

// Spinner simple para las cargas iniciales
function FullPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    </div>
  );
}

// The original Pages component is now a named export.
// This preserves its functionality for routing.
export function Pages() {
  return (
    <Suspense fallback={<FullPageFallback />}>
      <Routes>
        <Route path="/" element={<Quizzes />} />
        <Route path="/Quizzes" element={<Quizzes />} />
        <Route path="/AdminProgress" element={<AdminProgress />} />
        <Route path="/Badges" element={<Badges />} />
        <Route path="/GamePlay" element={<GamePlay />} />
        <Route path="/MyTasks" element={<MyTasks />} />
        <Route path="/AdminTasks" element={<AdminTasks />} />
      </Routes>
    </Suspense>
  );
}

// The default export for this file is now the default export from Quizzes.
export { default } from './Quizzes';