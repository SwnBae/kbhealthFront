<template>
  <div class="login-page">
    <!-- 배경은 CSS에서 설정 -->
    <div class="login-panel">
      <div v-if="state.currentMember.id">
        <p>안녕하세요? {{ state.currentMember.name }}님!</p>
        <button @click="logout()">로그아웃</button>
      </div>
      <div v-else>
        <h1>Login</h1>
        <label for="loginId">
          <span>아이디</span>
          <input type="text" id="loginId" v-model="state.form.loginId" placeholder="아이디를 입력하세요" />
        </label>
        <label for="loginPw">
          <span>패스워드</span>
          <input type="password" id="loginPw" v-model="state.form.loginPw" placeholder="비밀번호를 입력하세요" />
        </label>
        <div class="options">
          <label><input type="checkbox" v-model="state.remember" /> Remember me</label>
          <router-link to="/forgot">Forgot Password?</router-link>
        </div>
        <button class="btn-login" @click="submit()">Login</button>
        <p class="register-link">
          회원이 아니라면? <router-link to="/register">회원가입</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import {reactive} from "vue";
import {useRouter} from "vue-router";

export default {
  setup() {
    const router = useRouter();
    const state = reactive({
      currentMember: { id: 0, account: "" },
      form: {
        loginId: "",
        loginPw: "",
      },
    });

    const submit = () => {
      const args = {
        account: state.form.loginId,
        password: state.form.loginPw,
      };

      axios
          .post("/api/auth/login", args)
          .then((response) => {
            // 서버에서 응답 받은 데이터 처리
            const { message, redirect } = response.data;  // message와 redirect 추출
            alert(message);  // 메시지 표시

            if (redirect) {
              router.push("/home").then(() => {
                location.reload();  // 경로 변경 후 강제로 새로 고침
              });
            }

            // 로그인 상태 업데이트
            state.currentMember = {
              id: response.data.id,
              account: response.data.account,
            };
          })
          .catch(() => {
            alert("로그인에 실패했습니다. 계정 정보를 확인해주세요.");
          });
    };


    const logout = () => {
      axios
          .get("/api/auth/logout")
          .then(() => {
            alert("로그아웃하였습니다.");
            state.currentMember = { id: 0, account: "" };
          })
          .catch(() => {
            alert("로그아웃 중 오류가 발생했습니다.");
          });
    };

    return { state, submit, logout };
  },
};
</script>

<style scoped>
/* 전체 화면 배경 */
.login-page {
  position: fixed;
  inset: 0;
  /* 배경이미지는 여기서 설정하세요 */
  /* background: url('/src/assets/img/photo-1603486002664-a7319421e133.jpg') no-repeat center/cover; */
  display: flex;
  align-items: center;
  justify-content: center;
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
  background: rgba(255,255,255,0.2);
  color: #fff;
}
.login-panel input::placeholder {
  color: rgba(255,255,255,0.7);
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
  background: rgba(255,255,255,0.3);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
}
.btn-login:hover {
  background: rgba(255,255,255,0.5);
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