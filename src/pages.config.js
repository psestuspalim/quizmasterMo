import AdminProgress from './pages/AdminProgress';
import AdminTasks from './pages/AdminTasks';
import Badges from './pages/Badges';
import ChallengePlay from './pages/ChallengePlay';
import CourseManagement from './pages/CourseManagement';
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
import AdminHome from './pages/AdminHome';
import AdminStudents from './pages/AdminStudents';
import AdminStudentDetail from './pages/AdminStudentDetail';
import AdminJsonManager from './pages/AdminJsonManager';
import AdminContent from './pages/AdminContent';


export const PAGES = {
    "AdminProgress": AdminProgress,
    "AdminTasks": AdminTasks,
    "Badges": Badges,
    "ChallengePlay": ChallengePlay,
    "CourseManagement": CourseManagement,
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
    "AdminHome": AdminHome,
    "AdminStudents": AdminStudents,
    "AdminStudentDetail": AdminStudentDetail,
    "AdminJsonManager": AdminJsonManager,
    "AdminContent": AdminContent,
}

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};