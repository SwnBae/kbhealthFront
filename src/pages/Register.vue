<template>
  <div class="login-page">
    <div class="login-panel">
      <h1>회원가입</h1>
      <label for="regAccount">
        <span>아이디</span>
        <input type="text" id="regAccount" v-model="form.regAccount" placeholder="아이디를 입력하세요" />
      </label>
      <label for="regPw">
        <span>패스워드</span>
        <input type="password" id="regPw" v-model="form.regPw" placeholder="비밀번호를 입력하세요" />
      </label>
      <label for="regUserName">
        <span>닉네임</span>
        <input type="text" id="regUserName" v-model="form.regUserName" placeholder="닉네임을 입력하세요" />
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
      <hr />
      <button class="btn-login" @click="register">회원가입</button>
      <p class="register-link">
        이미 계정이 있으신가요? <router-link to="/login">로그인</router-link>
      </p>
    </div>
  </div>
</template>

<script>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'RegisterPage',
  setup() {
    const router = useRouter()
    const form = reactive({
      regAccount: '',
      regPw: '',
      regUserName: '',
      regHeight: '',
      regWeight: '',
      regGender: 'MALE',
      regAge: ''
    })
    const register = () => {
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
          router.push('/login')
        })
        .catch(() => {
          alert('회원가입에 실패했습니다. 입력 정보를 확인해주세요.')
        })
    }
    return { form, register }
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
.login-panel input,
.login-panel select {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  box-sizing: border-box;
}
.login-panel input::placeholder {
  color: rgba(255,255,255,0.7);
}

/* 구분선 */
.login-panel hr {
  margin: 2rem 0;
  border: 0;
  border-top: 1px solid rgba(255,255,255,0.3);
}

/* 버튼 */
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

/* 링크 */
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
