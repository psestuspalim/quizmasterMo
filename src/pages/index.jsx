import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "../Layout";

// ✅ Lazy load de todas las páginas para reducir el bundle inicial
const Quizzes = lazy(() => import("./Quizzes"));
const AdminProgress = lazy(() => import("./AdminProgress"));
const Progress = lazy(() => import("./Progress"));
const Leaderboard = lazy(() => import("./Leaderboard"));
const Badges = lazy(() => import("./Badges"));
const ChallengePlay = lazy(() => import("./ChallengePlay"));
const GameLobby = lazy(() => import("./GameLobby"));
const GamePlay = lazy(() => import("./GamePlay"));
const MyTasks = lazy(() => import("./MyTasks"));
const AdminTasks = lazy(() => import("./AdminTasks"));
const TournamentLobby = lazy(() => import("./TournamentLobby"));
const TournamentPlay = lazy(() => import("./TournamentPlay"));

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

function PagesContent() {
  return (
    <Layout>
      {/* Suspense envuelve todas las rutas lazy */}
      <Suspense fallback={<FullPageFallback />}>
        <Routes>
          {/* Ruta por defecto */}
          <Route path="/" element={<Quizzes />} />

          {/* Mantengo los mismos paths que ya usas en createPageUrl('Quizzes'), etc. */}
          <Route path="/Quizzes" element={<Quizzes />} />
          <Route path="/AdminProgress" element={<AdminProgress />} />
          <Route path="/Progress" element={<Progress />} />
          <Route path="/Leaderboard" element={<Leaderboard />} />
          <Route path="/Badges" element={<Badges />} />
          <Route path="/ChallengePlay" element={<ChallengePlay />} />
          <Route path="/GameLobby" element={<GameLobby />} />
          <Route path="/GamePlay" element={<GamePlay />} />
          <Route path="/MyTasks" element={<MyTasks />} />
          <Route path="/AdminTasks" element={<AdminTasks />} />
          <Route path="/TournamentLobby" element={<TournamentLobby />} />
          <Route path="/TournamentPlay" element={<TournamentPlay />} />

          {/* (Opcional) Ruta catch-all a Quizzes o a una página 404 más adelante */}
          {/* <Route path="*" element={<Quizzes />} /> */}
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}