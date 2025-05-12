import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Cart from "@/pages/Cart";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import DietRecord from "@/pages/DietRecord";
import ExerciseRecord from "@/pages/ExerciseRecord";
import Ranking from "@/pages/Ranking";

import { createRouter, createWebHistory } from "vue-router/dist/vue-router";

const routes = [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/cart', component: Cart },
    { path: '/profile/:account?', component: Profile },
    { path: '/diet-record', component: DietRecord },
    { path: '/exercise-record', component: ExerciseRecord },
    { path: '/ranking', component: Ranking }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
