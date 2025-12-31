import AdminProgress from './pages/AdminProgress';
import AdminTasks from './pages/AdminTasks';
import Badges from './pages/Badges';
import ChallengePlay from './pages/ChallengePlay';
import GameLobby from './pages/GameLobby';
import GamePlay from './pages/GamePlay';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import LiveSessions from './pages/LiveSessions';
import MyTasks from './pages/MyTasks';
import Progress from './pages/Progress';
import Quizzes from './pages/Quizzes';
import TournamentLobby from './pages/TournamentLobby';
import TournamentPlay from './pages/TournamentPlay';
import index from './pages/index';
import CourseManagement from './pages/CourseManagement';


export const PAGES = {
    "AdminProgress": AdminProgress,
    "AdminTasks": AdminTasks,
    "Badges": Badges,
    "ChallengePlay": ChallengePlay,
    "GameLobby": GameLobby,
    "GamePlay": GamePlay,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "LiveSessions": LiveSessions,
    "MyTasks": MyTasks,
    "Progress": Progress,
    "Quizzes": Quizzes,
    "TournamentLobby": TournamentLobby,
    "TournamentPlay": TournamentPlay,
    "index": index,
    "CourseManagement": CourseManagement,
}

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};