<!-- components/profile/ProfileRing.vue -->
<template>
  <div class="profile-ring-container" :style="containerStyle">
    <svg class="profile-ring" :style="svgStyle" viewBox="0 0 36 36">
      <circle 
        class="ring-bg" 
        cx="18" 
        cy="18" 
        r="16" 
        :stroke-width="strokeWidth" 
      />
      <circle
        class="ring-progress"
        cx="18"
        cy="18"
        r="16"
        :stroke-width="strokeWidth"
        :stroke-dasharray="`${(Math.min(1000, baseScore || 0) / 1000 * 100.48).toFixed(2)} 100.48`"
        transform="rotate(-90 18 18)"
        :stroke="progressColor"
      />
    </svg>
    <img 
      :src="profileImageUrl" 
      :alt="altText" 
      class="profile-img" 
      :style="imageStyle" 
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 프로필 이미지 URL
  profileImageUrl: {
    type: String,
    required: true,
    default: '/images/default_profile.png'
  },
  // 기본 점수 (0-1000)
  baseScore: {
    type: Number,
    default: 0
  },
  // 컨테이너 크기 (px)
  size: {
    type: Number,
    default: 42  // 작은 사이즈를 기본값으로 설정
  },
  // 이미지 테두리 두께 (px)
  strokeWidth: {
    type: Number,
    default: 2.5
  },
  // 진행 링 색상
  progressColor: {
    type: String,
    default: '#a5d6a7'  // 기본 녹색 계열
  },
  // 이미지 설명
  altText: {
    type: String,
    default: 'profile'
  }
});

// 컨테이너 스타일 계산
const containerStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`
  };
});

// SVG 스타일 계산
const svgStyle = computed(() => {
  return {
    width: `${props.size}px`,
    height: `${props.size}px`
  };
});

// 이미지 스타일 계산
const imageStyle = computed(() => {
  const padding = props.strokeWidth + 2; // 약간의 여백 추가
  const imgSize = props.size - (padding * 2);
  
  return {
    width: `${imgSize}px`,
    height: `${imgSize}px`,
    top: `${padding}px`,
    left: `${padding}px`
  };
});
</script>

<style scoped>
.profile-ring-container {
  position: relative;
}

.profile-ring {
  position: absolute;
  top: 0;
  left: 0;
}

.ring-bg {
  fill: none;
  stroke: #f0f7f0;
}

.ring-progress {
  fill: none;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.profile-img {
  border-radius: 50%;
  object-fit: cover;
  position: absolute;
  z-index: 1;
  border: 1px solid #f0f0f0;
}
</style>