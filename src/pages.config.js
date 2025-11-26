import Quizzes from './pages/Quizzes';
import AdminProgress from './pages/AdminProgress';
import Progress from './pages/Progress';
import Leaderboard from './pages/Leaderboard';
import Badges from './pages/Badges';
import ChallengePlay from './pages/ChallengePlay';


export const PAGES = {
    "Quizzes": Quizzes,
    "AdminProgress": AdminProgress,
    "Progress": Progress,
    "Leaderboard": Leaderboard,
    "Badges": Badges,
    "ChallengePlay": ChallengePlay,
}

export const pagesConfig = {
    mainPage: "Quizzes",
    Pages: PAGES,
};