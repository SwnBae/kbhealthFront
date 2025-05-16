<template>
  <div class="login-page">
    <!-- Rabbit Animation (login only) -->
    <transition name="fade" mode="out-in">
      <RabbitAnimation
        v-if="!isRegistering"
        :id-length="state.form.loginId.length"
        :pw-focused="pwFocused"
        :login-success="loginSuccess"
        @animation-end="onAnimationEnd"
      />
    </transition>

    <!-- Auth Panel with expand transition -->
    <div class="login-panel" :class="{ registering: isRegistering }">
      <transition name="fade" mode="out-in">
        <!-- Login Form -->
        <div v-if="!isRegistering" class="panel-content" key="login">
          <h1>Login</h1>
          <label for="loginId">
            <span>아이디</span>
            <input
              id="loginId"
              type="text"
              v-model="state.form.loginId"
              placeholder="아이디를 입력하세요"
              @focus="onIdFocus"
              @blur="onIdBlur"
            />
          </label>
          <label for="loginPw">
            <span>비밀번호</span>
            <input
              id="loginPw"
              type="password"
              v-model="state.form.loginPw"
              placeholder="비밀번호를 입력하세요"
              @focus="onPwFocus"
              @blur="onPwBlur"
            />
          </label>
          <button class="btn-login" @click="submitLogin">Login</button>
        </div>

        <!-- Register Form -->
        <div v-else class="panel-content" key="register">
          <button class="btn-back" @click="toggleForm">← 로그인으로 돌아가기</button>
          <h1>회원가입</h1>
          <label for="regAccount"><span>아이디</span><input type="text" id="regAccount" v-model="form.regAccount" placeholder="아이디를 입력하세요" /></label>
          <label for="regPw"><span>비밀번호</span><input type="password" id="regPw" v-model="form.regPw" placeholder="비밀번호를 입력하세요" /></label>
          <label for="regUserName"><span>닉네임</span><input type="text" id="regUserName" v-model="form.regUserName" placeholder="닉네임을 입력하세요" /></label>
          <label for="regHeight"><span>키 (cm)</span><input type="number" id="regHeight" v-model="form.regHeight" placeholder="키를 입력하세요" /></label>
          <label for="regWeight"><span>몸무게 (kg)</span><input type="number" id="regWeight" v-model="form.regWeight" placeholder="몸무게를 입력하세요" /></label>
          <label for="regGender"><span>성별</span><select id="regGender" v-model="form.regGender"><option value="MALE">남성</option><option value="FEMALE">여성</option></select></label>
          <label for="regAge"><span>나이</span><input type="number" id="regAge" v-model="form.regAge" placeholder="나이를 입력하세요" /></label>
          <button class="btn-login" @click="registerUser">회원가입</button>
        </div>
      </transition>

      <!-- 수정된 Toggle Link - 항상 동일한 높이 유지 -->
      <div class="toggle-link-container">
        <transition name="fade" mode="out-in">
          <div v-if="!isRegistering" key="register-link" class="toggle-link">
            <a href="#" @click.prevent="toggleForm">회원이 아니라면? 회원가입</a>
          </div>
          <div v-else key="empty-link" class="toggle-link empty">
            <!-- 빈 공간 유지용 더미 요소 -->
          </div>
        </transition>
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
  name: 'LoginRegisterPage',
  components: { RabbitAnimation },
  setup() {
    const router = useRouter()
    const isRegistering = ref(false)

    const state = reactive({ currentMember: { id: 0, name: '', account: '' }, form: { loginId: '', loginPw: '' } })
    const pwFocused = ref(false)
    const idFocused = ref(false)
    const loginSuccess = ref(false)
    const pendingMember = ref(null)

    const form = reactive({ regAccount: '', regPw: '', regUserName: '', regHeight: '', regWeight: '', regGender: 'MALE', regAge: '' })

    const toggleForm = () => { 
      // 폼 전환 시 부드러운 애니메이션을 위해 약간의 딜레이 추가
      setTimeout(() => {
        isRegistering.value = !isRegistering.value 
      }, 50)
    }
    
    const onIdFocus = () => { idFocused.value = true }
    const onIdBlur  = () => { idFocused.value = false }
    const onPwFocus = () => { pwFocused.value = true }
    const onPwBlur  = () => { pwFocused.value = false }

    const submitLogin = () => {
      const args = { account: state.form.loginId, password: state.form.loginPw }
      axios.post('/api/auth/login', args)
        .then(({ data }) => { pendingMember.value = { id: data.id, account: data.account, name: data.name }; loginSuccess.value = true })
        .catch(() => { alert('로그인에 실패했습니다. 계정 정보를 확인해주세요.') })
    }

    const onAnimationEnd = () => {
      if (pendingMember.value) {
        userStore.commit('setCurrentMember', pendingMember.value)
        router.push('/home')
      }
    }

    const registerUser = () => {
      const args = { account: form.regAccount, password: form.regPw, userName: form.regUserName, height: form.regHeight, weight: form.regWeight, gender: form.regGender, age: form.regAge }
      axios.post('/api/auth/regist', args)
        .then(({ data }) => { alert(data.message || '회원가입에 성공했습니다.'); toggleForm() })
        .catch(() => { alert('회원가입에 실패했습니다. 입력 정보를 확인해주세요.') })
    }

    return { state, form, isRegistering, pwFocused, idFocused, loginSuccess, onIdFocus, onIdBlur, onPwFocus, onPwBlur, submitLogin, registerUser, toggleForm, onAnimationEnd }
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  background: url('/src/assets/img/background_image.png') no-repeat center/cover;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.login-panel {
  width: 360px;
  max-width: 90%;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.37);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  color: #fff;
  font-family: 'Arial', sans-serif;
  padding: 2rem;
  height: auto;
  overflow: hidden;
  transition: max-height 0.5s ease;
}

.login-panel:not(.registering) {
  max-height: 400px; /* 로그인 폼 실제 높이에 맞게 조정 */
}

.login-panel.registering {
  max-height: 850px; /* 회원가입 폼 실제 높이에 맞게 조정 */
}

/* Fade transition for inner content */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.panel-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.btn-back {
  background: transparent;
  border: none;
  color: #e0e0e0;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  cursor: pointer;
}
.btn-back:hover {
  color: #fff;
}

.panel-content h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
  font-weight: 600;
}

.panel-content label {
  display: block;
  margin-bottom: 1rem;
}

.panel-content label span {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.panel-content input,
.panel-content select {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  box-sizing: border-box;
}
.panel-content input::placeholder {
  color: rgba(255,255,255,0.7);
}

.btn-login {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: bold;
  background: rgba(255,255,255,0.3);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}
.btn-login:hover {
  background: rgba(255,255,255,0.5);
}

/* 수정된 토글 링크 스타일 */
.toggle-link-container {
  height: 2rem; /* 고정된 높이로 설정 */
  margin-top: 1rem;
  position: relative;
}

.toggle-link {
  position: absolute;
  width: 100%;
  text-align: center;
  font-size: 0.9rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-link.empty {
  /* 빈 공간도 동일한 높이 유지 */
}

.toggle-link a {
  color: #e0e0e0;
  text-decoration: underline;
  cursor: pointer;
}
.toggle-link a:hover {
  color: #fff;
}
</style>