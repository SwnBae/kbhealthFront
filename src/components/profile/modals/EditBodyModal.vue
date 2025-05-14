<!-- components/profile/modals/EditBodyInfoModal.vue -->
<template>
  <div class="modal" @click.self="$emit('close')">
    <div class="modal-content">
      <h3 class="modal-title">신체정보 수정</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>키(cm): <input type="number" v-model.number="localEditBodyInfo.height" required /></label>
        </div>
        <div class="form-group">
          <label>몸무게(kg): <input type="number" v-model.number="localEditBodyInfo.weight" required /></label>
        </div>
        <div class="form-group">
          <label>성별:
            <select v-model="localEditBodyInfo.gender" required>
              <option disabled value="">선택</option>
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
          </label>
        </div>
        <div class="form-group">
          <label>나이: <input type="number" v-model.number="localEditBodyInfo.age" required /></label>
        </div>
        <div class="button-group">
          <button type="submit" class="submit-button">저장</button>
          <button type="button" class="cancel-button" @click="$emit('close')">취소</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue';

const props = defineProps({
  editBodyInfo: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'submit', 'update:editBodyInfo']);

// props의 복사본을 로컬 상태로 사용
const localEditBodyInfo = ref({...props.editBodyInfo});

// props가 변경되면 로컬 상태도 업데이트
watch(() => props.editBodyInfo, (newValue) => {
  localEditBodyInfo.value = {...newValue};
}, {deep: true});

// 폼 제출 처리
const handleSubmit = () => {
  // 변경된 값을 부모에게 알리고 submit 이벤트 발생
  emit('update:editBodyInfo', localEditBodyInfo.value);
  emit('submit');
};
</script>

<style scoped>
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-title {
  font-size: 1.5rem;
  color: #222;
  text-align: center;
  margin-bottom: 1.5rem;
  position: relative;
  padding-bottom: 8px;
}

.modal-title::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 2px;
  background-color: #e6e6e6;
  border-radius: 1px;
}

.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  color: #444;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 1rem;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #a5d6a7;
  box-shadow: 0 0 0 2px rgba(165, 214, 167, 0.3);
  outline: none;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.submit-button,
.cancel-button {
  padding: 0.8rem 1.5rem;
  border-radius: 20px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.submit-button {
  background-color: #4CAF50;
  color: white;
  border: none;
}

.submit-button:hover {
  background-color: #3d8b40;
  transform: translateY(-2px);
}

.cancel-button {
  background-color: #f0f0f0;
  color: #555;
  border: 1px solid #ddd;
}

.cancel-button:hover {
  background-color: #e6e6e6;
  transform: translateY(-2px);
}
</style>