import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Cart from "@/pages/Cart";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Record from "@/pages/Record.vue";
import Ranking from "@/pages/Ranking";

import { createRouter, createWebHistory } from "vue-router/dist/vue-router";
import FeedBlock from "@/components/feed/FeedBlock.vue";
import FeedWrite from "@/components/FeedWrite.vue";

const routes = [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/cart', component: Cart },
    { path: '/profile/:account?', component: Profile },
    { path: '/records', component: Record},
    { path: '/ranking', component: Ranking },
    { path: '/feed', component: FeedBlock},
    { path: '/feed/write', component: FeedWrite }

];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;
