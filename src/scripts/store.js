import { defineStore } from 'pinia'

// Vuex의 userStore를 Pinia의 useUserStore로 변환
export const useUserStore = defineStore('user', {
  state: () => ({
    currentMember: {
      id: 0,
      account: ''
    }
  }),
  actions: {
    // Vuex의 mutation을 Pinia의 action으로 변환
    setCurrentMember(payload) {
      this.currentMember.id = payload.id;
      this.currentMember.account = payload.account;
    }
  }
})