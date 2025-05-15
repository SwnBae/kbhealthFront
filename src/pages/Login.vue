<template>
  <div class="login-page">
    <!-- Rabbit Animation 컴포넌트: props 전달 및 완료 이벤트 처리 -->
    <RabbitAnimation :id-length="state.form.loginId.length" :pw-focused="pwFocused" :login-success="loginSuccess"
      @animation-end="onAnimationEnd" />

    <div class="login-panel">
      <div v-if="state.currentMember.id">
        <p>안녕하세요? {{ state.currentMember.name }}님!</p>
        <button @click="logout">로그아웃</button>
      </div>
      <div v-else>
        <h1>Login</h1>
        <label for="loginId">
          <span>아이디</span>
          <input id="loginId" type="text" v-model="state.form.loginId" placeholder="아이디를 입력하세요" @focus="onIdFocus"
            @blur="onIdBlur" />
        </label>
        <label for="loginPw">
          <span>패스워드</span>
          <input id="loginPw" type="password" v-model="state.form.loginPw" placeholder="비밀번호를 입력하세요" @focus="onPwFocus"
            @blur="onPwBlur" />
        </label>
        <button class="btn-login" @click="submitLogin">Login</button>
        <p class="register-link">
          회원이 아니라면? <router-link to="/register">회원가입</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import RabbitAnimation from '@/components/login/RabbitAnimation.vue'
import userStore from '@/scripts/store'

export default {
  name: 'LoginPage',
  components: { RabbitAnimation },
  setup() {
    const router = useRouter()
    const state = reactive({
      currentMember: { id: 0, name: '', account: '' },
      form: { loginId: '', loginPw: '' },
      remember: false
    })
    const pwFocused = ref(false)
    const idFocused = ref(false)
    const loginSuccess = ref(false)
    const pendingMember = ref(null)

    // 입력 포커스 핸들러
    const onIdFocus = () => { idFocused.value = true }
    const onIdBlur  = () => { idFocused.value = false }
    const onPwFocus = () => { pwFocused.value = true }
    const onPwBlur  = () => { pwFocused.value = false }

    // 로그인 요청
    const submitLogin = () => {
      const args = { account: state.form.loginId, password: state.form.loginPw }
      axios.post('/api/auth/login', args)
        .then(({ data }) => {
          // 애니메이션 후 커밋하기 위해 저장
          pendingMember.value = { id: data.id, account: data.account, name: data.name }
          loginSuccess.value = true
        })
        .catch(() => {
          alert('로그인에 실패했습니다. 계정 정보를 확인해주세요.')
        })
    }

    // 애니메이션 끝난 후 호출
    const onAnimationEnd = () => {
      if (pendingMember.value) {
        userStore.commit('setCurrentMember', pendingMember.value)
      }
      router.push('/home')
    }

    // 로그아웃
    const logout = () => {
      axios.get('/api/auth/logout')
        .then(() => {
          alert('로그아웃하였습니다.')
          userStore.commit('setCurrentMember', { id: 0, account: '', name: '' })
        })
        .catch(() => {
          alert('로그아웃 중 오류가 발생했습니다.')
        })
    }

    return {
      state,
      pwFocused,
      idFocused,
      loginSuccess,
      onIdFocus,
      onIdBlur,
      onPwFocus,
      onPwBlur,
      submitLogin,
      logout,
      onAnimationEnd
    }
  }
}
</script>

<style scoped>
/* 전체 화면 배경 */
.login-page {
  position: fixed;
  inset: 0;
  background: url('/src/assets/img/background_image.png') no-repeat center/cover;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

/* 글라스모피즘 패널 */
.login-panel {
  width: 360px;
  max-width: 90%;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.37);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  color: #fff;
  font-family: 'Arial', sans-serif;
}

/* 제목 */
.login-panel h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 600;
}

/* 레이블 & 인풋 */
.login-panel label {
  display: block;
  margin-bottom: 1rem;
}

.login-panel label span {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.login-panel input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.login-panel input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

/* 옵션 영역 (체크박스, 링크) */
.options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
}

.options a {
  color: #e0e0e0;
  text-decoration: underline;
}

.options a:hover {
  color: #fff;
}

/* 로그인 버튼 */
.btn-login {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.3);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}

.btn-login:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 회원가입 링크 */
.register-link {
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.register-link a {
  color: #e0e0e0;
  text-decoration: underline;
}

.register-link a:hover {
  color: #fff;
}
</style>