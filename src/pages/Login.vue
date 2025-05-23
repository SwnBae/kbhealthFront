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

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import RabbitAnimation from '@/components/login/RabbitAnimation.vue'
// Vuex 스토어 → Pinia 스토어로 변경
import { useUserStore } from '@/scripts/store'

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

// 폼 전환 메서드
const toggleForm = () => { 
  // 폼 전환 시 부드러운 애니메이션을 위해 약간의 딜레이 추가
  setTimeout(() => {
    isRegistering.value = !isRegistering.value 
  }, 50)
}

// 폼 포커스 이벤트 핸들러
const onIdFocus = () => { idFocused.value = true }
const onIdBlur = () => { idFocused.value = false }
const onPwFocus = () => { pwFocused.value = true }
const onPwBlur = () => { pwFocused.value = false }

// 로그인 제출
const submitLogin = async () => {
  console.log('🔑 Login - 로그인 시도 시작');
  console.log('🔑 Login - 요청 데이터:', { account: state.form.loginId, password: '***' });
  
  const args = { account: state.form.loginId, password: state.form.loginPw }
  
  try {
    // 1단계: 로그인 요청
    console.log('📡 Login - 로그인 API 호출');
    const loginResponse = await axios.post('/api/auth/login', args);
    
    console.log('✅ Login - 로그인 응답:', loginResponse.data);
    
    // 로그인 성공 확인
    if (loginResponse.data.message === "로그인 성공") {
      console.log('✅ Login - 로그인 성공, 사용자 정보 조회 시작');
      
      // 2단계: 사용자 정보 조회
      console.log('📡 Login - 사용자 정보 조회 API 호출');
      const checkResponse = await axios.get('/api/auth/check');
      
      console.log('✅ Login - 사용자 정보 응답:', checkResponse.data);
      
      // 사용자 정보 추출
      const userData = checkResponse.data;
      console.log('👤 Login - 추출된 사용자 정보:', userData);
      console.log('👤 Login - 사용자 ID:', userData.id);
      console.log('👤 Login - 사용자 계정:', userData.account);
      
      if (userData.id) {
        pendingMember.value = { 
          id: userData.id, 
          account: userData.account, 
          name: userData.name || userData.account // name이 없으면 account 사용
        };
        
        console.log('✅ Login - pendingMember 설정:', pendingMember.value);
        loginSuccess.value = true;
        console.log('🎬 Login - 애니메이션 시작');
      } else {
        console.error('❌ Login - 사용자 정보에 ID가 없음');
        alert('사용자 정보를 가져오는데 실패했습니다.');
      }
    } else {
      console.error('❌ Login - 로그인 실패:', loginResponse.data);
      alert('로그인에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('❌ Login - 오류 발생:', error);
    
    if (error.response?.status === 401) {
      console.error('❌ Login - 인증 실패 (401)');
      alert('계정 정보가 올바르지 않습니다.');
    } else if (error.response?.data) {
      console.error('❌ Login - 서버 오류:', error.response.data);
      alert('로그인 처리 중 오류가 발생했습니다.');
    } else {
      console.error('❌ Login - 네트워크 오류:', error.message);
      alert('네트워크 오류가 발생했습니다.');
    }
  }
}

// 애니메이션 완료 후 호출되는 메서드
const onAnimationEnd = () => {
  console.log('🎬 Login - 애니메이션 완료');
  console.log('🎬 Login - pendingMember:', pendingMember.value);
  
  if (pendingMember.value) {
    console.log('👤 Login - 사용자 정보 Store에 저장');
    console.log('👤 Login - 저장할 데이터:', pendingMember.value);
    
    // Vuex mutation → Pinia action으로 변경
    userStore.setCurrentMember(pendingMember.value);
    
    console.log('👤 Login - Store 저장 후 확인:', userStore.currentMember);
    console.log('🏠 Login - /home으로 이동');
    
    router.push('/home');
  } else {
    console.error('❌ Login - pendingMember가 없어서 이동 실패');
  }
}

// 회원가입 메서드
const registerUser = () => {
  const args = { 
    account: form.regAccount, 
    password: form.regPw, 
    userName: form.regUserName, 
    height: form.regHeight, 
    weight: form.regWeight, 
    gender: form.regGender, 
    age: form.regAge 
  }
  
  axios.post('/api/auth/regist', args)
    .then(({ data }) => { 
      alert(data.message || '회원가입에 성공했습니다.')
      toggleForm() 
    })
    .catch(() => { 
      alert('회원가입에 실패했습니다. 입력 정보를 확인해주세요.') 
    })
}
</script>

<style scoped>
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
  max-height: 380px; /* 로그인 폼에 맞게 조정 */
}

.login-panel.registering {
  max-height: min(850px, 80vh); /* 고정값과 뷰포트 비율 중 작은 값 사용 */
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

/* 로그인 모드와 회원가입 모드에 따른 스크롤 설정 */
.login-panel:not(.registering) .panel-content {
  overflow-y: visible;
  padding-right: 0;
  margin-right: 0;
}

.login-panel.registering .panel-content {
  max-height: calc(min(850px, 80vh) - 5rem); /* 패널 최대 높이에서 패딩과 링크 영역 제외 */
  overflow-y: auto; /* 세로 스크롤 활성화 */
  padding-right: 12px; /* 스크롤바와 콘텐츠 사이 간격 추가 */
  margin-right: -12px; /* 패딩 추가에 따른 너비 조정 */
}

/* 개선된 스크롤바 스타일링 */
.panel-content::-webkit-scrollbar {
  width: 6px; /* 스크롤바 너비 약간 증가 */
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.03); /* 더 투명하게 */
  border-radius: 10px;
  margin: 4px 0; /* 스크롤바 위아래 여백 */
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15); /* 더 투명하게 */
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05); /* 테두리 추가 */
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

/* 토글 링크 스타일 */
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

.toggle-link a {
  color: #e0e0e0;
  text-decoration: underline;
  cursor: pointer;
}
.toggle-link a:hover {
  color: #fff;
}
</style>