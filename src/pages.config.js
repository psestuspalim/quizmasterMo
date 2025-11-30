import Quizzes from './pages/Quizzes';
import AdminProgress from './pages/AdminProgress';
import Progress from './pages/Progress';
import Leaderboard from './pages/Leaderboard';
import Badges from './pages/Badges';
import ChallengePlay from './pages/ChallengePlay';
import GameLobby from './pages/GameLobby';
import GamePlay from './pages/GamePlay';
import MyTasks from './pages/MyTasks';
import AdminTasks from './pages/AdminTasks';


export const PAGES = {
    "Quizzes": Quizzes,
    "AdminProgress": AdminProgress,
    "Progress": Progress,
    "Leaderboard": Leaderboard,
    "Badges": Badges,
    "ChallengePlay": ChallengePlay,
    "GameLobby": GameLobby,
    "GamePlay": GamePlay,
    "MyTasks": MyTasks,
    "AdminTasks": AdminTasks,
}

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};