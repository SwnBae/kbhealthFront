<template>
  <div class="login-page">
    <transition name="fade" mode="out-in">
      <div v-if="!isRegistering" class="logo-container">
        <img src="/assets/logo.png" alt="Logo" class="logo" />
      </div>
    </transition>
    <!-- Rabbit Animation (login only) -->
    <transition name="fade" mode="out-in">
      <RabbitAnimation v-if="!isRegistering" :id-length="state.form.loginId.length" :pw-focused="pwFocused"
        :login-success="loginSuccess" @animation-end="onAnimationEnd" />
    </transition>

    <!-- Auth Panel with expand transition -->
    <div class="login-panel" :class="{ registering: isRegistering }">
      <transition name="fade" mode="out-in">
        <!-- Login Form -->
        <div v-if="!isRegistering" class="panel-content" key="login">
          <h1>Login</h1>
          <label for="loginId">
            <span>아이디</span>
            <input id="loginId" type="text" v-model="state.form.loginId" placeholder="아이디를 입력하세요" @focus="onIdFocus"
              @blur="onIdBlur" @keyup.enter="focusPassword" />
          </label>
          <label for="loginPw">
            <span>비밀번호</span>
            <input id="loginPw" type="password" v-model="state.form.loginPw" placeholder="비밀번호를 입력하세요"
              @focus="onPwFocus" @blur="onPwBlur" @keyup.enter="submitLogin" />
          </label>
          <button class="btn-login" @click="submitLogin">Login</button>
        </div>

        <!-- Register Form -->
        <div v-else class="panel-content" key="register">
          <button class="btn-back" @click="toggleForm">← 로그인으로 돌아가기</button>
          <h1>회원가입</h1>

          <label for="regAccount">
            <span>아이디</span>
            <input type="text" id="regAccount" v-model="form.regAccount" placeholder="아이디를 입력하세요"
              @input="onAccountInput" @blur="checkAccount" />
            <div class="validation-msg" :class="accountValidation.status">
              {{ accountValidation.message || '' }}
            </div>
          </label>

          <label for="regPw">
            <span>비밀번호</span>
            <input type="password" id="regPw" v-model="form.regPw" placeholder="비밀번호를 입력하세요" />
          </label>

          <label for="regUserName">
            <span>닉네임</span>
            <input type="text" id="regUserName" v-model="form.regUserName" placeholder="닉네임을 입력하세요"
              @input="onUsernameInput" @blur="checkUsername" />
            <div class="validation-msg" :class="usernameValidation.status">
              {{ usernameValidation.message || '' }}
            </div>
          </label>

          <label for="regHeight">
            <span>키 (cm)</span>
            <input type="number" id="regHeight" v-model="form.regHeight" placeholder="키를 입력하세요" />
          </label>

          <label for="regWeight">
            <span>몸무게 (kg)</span>
            <input type="number" id="regWeight" v-model="form.regWeight" placeholder="몸무게를 입력하세요" />
          </label>

          <label for="regGender">
            <span>성별</span>
            <select id="regGender" v-model="form.regGender">
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
          </label>

          <label for="regAge">
            <span>나이</span>
            <input type="number" id="regAge" v-model="form.regAge" placeholder="나이를 입력하세요" />
          </label>

          <button class="btn-login" @click="registerUser" :disabled="!isFormValid">
            회원가입
          </button>
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

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import RabbitAnimation from '@/components/login/RabbitAnimation.vue'
// Vuex 스토어 → Pinia 스토어로 변경
import { useUserStore } from '@/scripts/store'
import { invalidateAuthCache } from '@/scripts/router';

// 라우터 및 유저 스토어 초기화
const router = useRouter()
const userStore = useUserStore()

// 상태 관리
const isRegistering = ref(false)
const state = reactive({
  currentMember: { id: 0, name: '', account: '' },
  form: { loginId: '', loginPw: '' }
})
const pwFocused = ref(false)
const idFocused = ref(false)
const loginSuccess = ref(false)
const pendingMember = ref(null)

// 회원가입 폼 상태
const form = reactive({
  regAccount: '',
  regPw: '',
  regUserName: '',
  regHeight: '',
  regWeight: '',
  regGender: 'MALE',
  regAge: ''
})

// 메시지 매핑 객체
const validationMessages = {
  // 아이디 관련
  ACCOUNT_EMPTY: '아이디를 입력해주세요.',
  ACCOUNT_LENGTH_INVALID: '아이디는 4-20자 사이로 입력해주세요.',
  ACCOUNT_DUPLICATE: '이미 사용중인 아이디입니다.',
  ACCOUNT_AVAILABLE: '사용 가능한 아이디입니다.',

  // 닉네임 관련
  USERNAME_EMPTY: '닉네임을 입력해주세요.',
  USERNAME_LENGTH_INVALID: '닉네임은 2-10자 사이로 입력해주세요.',
  USERNAME_DUPLICATE: '이미 사용중인 닉네임입니다.',
  USERNAME_AVAILABLE: '사용 가능한 닉네임입니다.',

  // 공통
  SERVER_ERROR: '서버 오류가 발생했습니다.',
  NETWORK_ERROR: '네트워크 오류가 발생했습니다.',
  CHECKING: '확인 중...'
}

// 메시지 가져오기 함수
const getMessage = (code) => {
  return validationMessages[code] || '알 수 없는 오류가 발생했습니다.'
}

// 중복 검사 상태
const accountValidation = reactive({
  status: '', // 'success', 'error', 'checking'
  message: ''
})

const usernameValidation = reactive({
  status: '', // 'success', 'error', 'checking'
  message: ''
})

// 타이머 관리
let accountCheckTimer = null
let usernameCheckTimer = null

// 폼 유효성 검사
const isFormValid = computed(() => {
  return form.regAccount &&
    form.regPw &&
    form.regUserName &&
    form.regHeight &&
    form.regWeight &&
    form.regAge &&
    accountValidation.status === 'success' &&
    usernameValidation.status === 'success'
})

// 폼 전환 메서드
const toggleForm = () => {
  // 폼 전환 시 부드러운 애니메이션을 위해 약간의 딜레이 추가
  setTimeout(() => {
    isRegistering.value = !isRegistering.value
    // 폼 전환 시 검증 상태 초기화
    if (isRegistering.value) {
      resetValidation()
    }
  }, 50)
}

// 검증 상태 초기화
const resetValidation = () => {
  accountValidation.status = ''
  accountValidation.message = ''
  usernameValidation.status = ''
  usernameValidation.message = ''
}

// 폼 포커스 이벤트 핸들러
const onIdFocus = () => { idFocused.value = true }
const onIdBlur = () => { idFocused.value = false }
const onPwFocus = () => { pwFocused.value = true }
const onPwBlur = () => { pwFocused.value = false }

// 아이디 입력 이벤트 (실시간 검사)
const onAccountInput = () => {
  // 이전 타이머 제거
  if (accountCheckTimer) {
    clearTimeout(accountCheckTimer)
  }

  // 입력 중일 때 상태 초기화
  accountValidation.status = ''
  accountValidation.message = ''

  // 500ms 후에 중복 검사 실행
  accountCheckTimer = setTimeout(() => {
    if (form.regAccount && form.regAccount.length >= 4) {
      checkAccount()
    }
  }, 500)
}

// 닉네임 입력 이벤트 (실시간 검사)
const onUsernameInput = () => {
  // 이전 타이머 제거
  if (usernameCheckTimer) {
    clearTimeout(usernameCheckTimer)
  }

  // 입력 중일 때 상태 초기화
  usernameValidation.status = ''
  usernameValidation.message = ''

  // 500ms 후에 중복 검사 실행
  usernameCheckTimer = setTimeout(() => {
    if (form.regUserName && form.regUserName.length >= 2) {
      checkUsername()
    }
  }, 500)
}

// 아이디 중복 검사
const checkAccount = async () => {
  if (!form.regAccount) return

  try {
    accountValidation.status = 'checking'
    accountValidation.message = getMessage('CHECKING')

    const response = await axios.get('/api/auth/check-account', {
      params: { account: form.regAccount }
    })

    const { available, code } = response.data

    if (available) {
      accountValidation.status = 'success'
      accountValidation.message = getMessage(code)
    } else {
      accountValidation.status = 'error'
      accountValidation.message = getMessage(code)
    }
  } catch (error) {
    console.error('아이디 중복 검사 오류:', error)
    accountValidation.status = 'error'

    // 서버 응답에 코드가 있으면 사용, 없으면 네트워크 오류로 처리
    if (error.response?.data?.code) {
      accountValidation.message = getMessage(error.response.data.code)
    } else {
      accountValidation.message = getMessage('NETWORK_ERROR')
    }
  }
}

// 닉네임 중복 검사
const checkUsername = async () => {
  if (!form.regUserName) return

  try {
    usernameValidation.status = 'checking'
    usernameValidation.message = getMessage('CHECKING')

    const response = await axios.get('/api/auth/check-username', {
      params: { username: form.regUserName }
    })

    const { available, code } = response.data

    if (available) {
      usernameValidation.status = 'success'
      usernameValidation.message = getMessage(code)
    } else {
      usernameValidation.status = 'error'
      usernameValidation.message = getMessage(code)
    }
  } catch (error) {
    console.error('닉네임 중복 검사 오류:', error)
    usernameValidation.status = 'error'

    // 서버 응답에 코드가 있으면 사용, 없으면 네트워크 오류로 처리
    if (error.response?.data?.code) {
      usernameValidation.message = getMessage(error.response.data.code)
    } else {
      usernameValidation.message = getMessage('NETWORK_ERROR')
    }
  }
}

// 비밀번호 입력란으로 포커스 이동
const focusPassword = () => {
  document.getElementById('loginPw').focus();
};

// ✅ 수정된 로그인 함수 - 애니메이션과 리다이렉트 분리
const submitLogin = async () => {
  console.log('🔑 Login - 로그인 시도 시작');
  console.log('🔑 Login - 요청 데이터:', { account: state.form.loginId, password: '***' });

  const args = { account: state.form.loginId, password: state.form.loginPw };

  try {
    // 1단계: 로그인 요청
    console.log('📡 Login - 로그인 API 호출');
    const loginResponse = await axios.post('/api/auth/login', args, {
      timeout: 10000
    });

    console.log('✅ Login - 로그인 응답:', loginResponse.data);

    // 로그인 성공 확인
    if (loginResponse.data.message === "로그인 성공") {
      console.log('✅ Login - 로그인 성공');

      // ✅ 토큰 저장 시도 (있으면 저장, 없어도 계속 진행)
      let token = null;

      if (loginResponse.data.token) {
        token = loginResponse.data.token;
        console.log('🔑 Login - data.token에서 토큰 발견');
      } else if (loginResponse.data.accessToken) {
        token = loginResponse.data.accessToken;
        console.log('🔑 Login - data.accessToken에서 토큰 발견');
      } else if (loginResponse.data.jwt) {
        token = loginResponse.data.jwt;
        console.log('🔑 Login - data.jwt에서 토큰 발견');
      } else if (loginResponse.headers.authorization) {
        token = loginResponse.headers.authorization.replace('Bearer ', '');
        console.log('🔑 Login - headers.authorization에서 토큰 발견');
      } else if (loginResponse.headers.Authorization) {
        token = loginResponse.headers.Authorization.replace('Bearer ', '');
        console.log('🔑 Login - headers.Authorization에서 토큰 발견');
      }

      if (token) {
        localStorage.setItem('jwt', token);
        console.log('✅ Login - JWT 토큰 저장 완료');
      } else {
        console.log('🍪 Login - JWT 토큰 없음, 쿠키 인증 사용 중');
      }

      // ✅ 2단계: 사용자 정보 조회 (토큰 유무와 관계없이 진행)
      console.log('📡 Login - 사용자 정보 조회 API 호출');

      try {
        const checkResponse = await axios.get('/api/auth/check', {
          timeout: 5000
        });

        console.log('✅ Login - 사용자 정보 응답:', checkResponse.data);

        const userData = checkResponse.data;
        console.log('👤 Login - 추출된 사용자 정보:', userData);

        if (userData && userData.id) {
          // ✅ 사용자 정보를 임시 저장 (애니메이션용)
          pendingMember.value = {
            id: userData.id,
            account: userData.account,
            name: userData.name || userData.account
          };

          console.log('✅ Login - pendingMember 설정:', pendingMember.value);

          // ✅ 인증 캐시 무효화
          invalidateAuthCache();
          console.log('✅ Login - 인증 캐시 무효화 완료');

          // ✅ 애니메이션 시작 - 리다이렉트는 onAnimationEnd에서 처리
          loginSuccess.value = true;
          console.log('🎬 Login - 로그인 성공 애니메이션 시작');

        } else {
          console.error('❌ Login - 사용자 정보에 ID가 없음:', userData);
          throw new Error('Invalid user data received');
        }

      } catch (checkError) {
        console.error('❌ Login - 사용자 정보 조회 실패:', checkError);
        throw checkError;
      }

    } else {
      console.error('❌ Login - 로그인 실패:', loginResponse.data);
      showErrorMessage('로그인에 실패했습니다.');
    }

  } catch (error) {
    console.error('❌ Login - 로그인 과정 오류:', error);

    // ✅ 서버에서 보내는 메시지 처리
    if (error.response) {
      // 서버가 응답했지만 오류 상태코드
      const status = error.response.status;
      const errorData = error.response.data;

      if (errorData && errorData.message) {
        // ✅ 서버에서 보내는 메시지를 그대로 사용
        showErrorMessage(errorData.message);
      } else if (status === 401) {
        showErrorMessage('아이디 또는 비밀번호가 올바르지 않습니다.');
      } else if (status === 404) {
        showErrorMessage('해당 계정으로 등록된 회원이 없습니다.');
      } else if (status === 429) {
        showErrorMessage('너무 많은 로그인 시도입니다. 잠시 후 다시 시도해주세요.');
      } else {
        showErrorMessage(`로그인 처리 중 오류가 발생했습니다. (${status})`);
      }
    } else if (error.request) {
      // 요청은 했지만 응답을 받지 못함
      showErrorMessage('네트워크 연결을 확인해주세요.');
    } else {
      // 요청 설정 중 오류 발생
      showErrorMessage('로그인 요청 처리 중 오류가 발생했습니다.');
    }
  }
};

// ✅ 에러 메시지 표시 함수
const showErrorMessage = (message) => {
  console.error('🚨 Login Error:', message);
  alert(message);
};

// 2. onAnimationEnd 메서드 수정
// ✅ 간단한 해결책 - 타이밍만 조정
const onAnimationEnd = async () => {
  console.log('🎬 Login - 애니메이션 완료');
  console.log('🎬 Login - pendingMember:', pendingMember.value);

  if (pendingMember.value && loginSuccess.value) {
    console.log('👤 Login - 사용자 정보 Store에 저장');

    // ✅ 사용자 정보를 스토어에 최종 저장
    userStore.setCurrentMember(pendingMember.value);

    console.log('👤 Login - Store 저장 후 확인:', userStore.currentMember);

    // ✅ 상태 초기화
    loginSuccess.value = false;
    pendingMember.value = null;

    // ✅ 쿠키 인증은 이미 설정되어 있으므로 바로 리다이렉트
    console.log('🏠 Login - /home으로 이동 시도');

    try {
      await router.push('/home');
      console.log('✅ Login - /home 이동 성공');
    } catch (error) {
      console.error('❌ Login - /home 이동 실패:', error);
      // 실패시에만 강제 새로고침
      window.location.href = '/home';
    }

  } else {
    console.error('❌ Login - pendingMember 또는 loginSuccess 상태 오류');
  }
}

// 회원가입 메서드
const registerUser = async () => {
  // 최종 검증
  if (!isFormValid.value) {
    alert('모든 필드를 올바르게 입력해주세요.')
    return
  }

  const args = {
    account: form.regAccount,
    password: form.regPw,
    userName: form.regUserName,
    height: form.regHeight,
    weight: form.regWeight,
    gender: form.regGender,
    age: form.regAge
  }

  try {
    const response = await axios.post('/api/auth/regist', args)
    alert(response.data.message || '회원가입에 성공했습니다.')

    // 폼 초기화
    Object.assign(form, {
      regAccount: '',
      regPw: '',
      regUserName: '',
      regHeight: '',
      regWeight: '',
      regGender: 'MALE',
      regAge: ''
    })

    // 검증 상태 초기화
    resetValidation()

    toggleForm()
  } catch (error) {
    console.error('회원가입 오류:', error)
    alert('회원가입에 실패했습니다. 입력 정보를 확인해주세요.')
  }
}
</script>

<style scoped>
.logo {
  max-width: 400px;
  height: auto;
  filter: brightness(1.1) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}
.login-page {
  position: fixed;
  inset: 0;
  background: url('/assets/img/background_image.png') no-repeat center/cover;
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
  overflow: hidden;

  /* 애니메이션 복원 */
  transition: max-height 0.5s ease;
}

/* 애니메이션을 위한 높이 복원 - 조정된 값 */
.login-panel:not(.registering) {
  max-height: 380px;
  /* 로그인 폼에 맞게 조정 */
}

.login-panel.registering {
  max-height: min(850px, 80vh);
  /* 고정값과 뷰포트 비율 중 작은 값 사용 */
}

/* Fade transition for inner content */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.panel-content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 로그인 모드와 회원가입 모드에 따른 스크롤 설정 */
.login-panel:not(.registering) .panel-content {
  overflow-y: visible;
  padding-right: 0;
  margin-right: 0;
}

.login-panel.registering .panel-content {
  max-height: calc(min(850px, 80vh) - 5rem);
  /* 패널 최대 높이에서 패딩과 링크 영역 제외 */
  overflow-y: auto;
  /* 세로 스크롤 활성화 */
  padding-right: 12px;
  /* 스크롤바와 콘텐츠 사이 간격 추가 */
  margin-right: -12px;
  /* 패딩 추가에 따른 너비 조정 */
}

/* 개선된 스크롤바 스타일링 */
.panel-content::-webkit-scrollbar {
  width: 6px;
  /* 스크롤바 너비 약간 증가 */
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03);
  /* 더 투명하게 */
  border-radius: 10px;
  margin: 4px 0;
  /* 스크롤바 위아래 여백 */
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  /* 더 투명하게 */
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  /* 테두리 추가 */
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 스크롤바 호버 시 더 잘 보이게 */
.login-panel.registering .panel-content:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.25);
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
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  box-sizing: border-box;
}

.panel-content input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

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

/* 토글 링크 스타일 */
.toggle-link-container {
  height: 2rem;
  /* 고정된 높이로 설정 */
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

.toggle-link a {
  color: #e0e0e0;
  text-decoration: underline;
  cursor: pointer;
}

.toggle-link a:hover {
  color: #fff;
}

.validation-msg {
  font-size: 12px;
  margin-top: 4px;
  height: 16px;
  /* 고정 높이로 레이아웃 안정화 */
  display: flex;
  align-items: center;
}

.validation-msg.success {
  color: #28a745;
}

.validation-msg.error {
  color: #dc3545;
}

.validation-msg.checking {
  color: #6c757d;
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>