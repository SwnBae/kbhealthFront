import { createStore } from 'vuex';

const userStore = createStore({  // 'userStore'라는 이름을 사용할 수 있음
    state() {
        return {
            currentMember: {
                id: 0,
                account: '' // 사용자 이름
            }
        };
    },
    mutations: {
        setCurrentMember(state, payload) {
            state.currentMember.id = payload.id;
            state.currentMember.account = payload.account;
        }
    }
});

export default userStore;
