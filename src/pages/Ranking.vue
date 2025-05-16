<template>
  <div class="feed-wrapper">
    <h1 class="header">랭킹</h1>

    <!-- 점수 기준 선택 (Total / Base) -->
    <div class="ranking-options">
      <button @click="setRankingType('total')" :class="{'active': rankingType === 'total'}">총 점수</button>
      <button @click="setRankingType('base')" :class="{'active': rankingType === 'base'}">최근 10일 점수</button>
    </div>

    <!-- 랭킹 리스트 출력 -->
    <div v-if="rankings.length > 0" class="rankings-container">
      <div v-for="(ranking, index) in rankings" :key="ranking.memberId"
           class="ranking-card animate-on-scroll"
           :style="{ animationDelay: `${index * 0.1}s` }">
        <div class="rank">
          <template v-if="index === 0">
            <span class="medal gold">🥇</span>
          </template>
          <template v-else-if="index === 1">
            <span class="medal silver">🥈</span>
          </template>
          <template v-else-if="index === 2">
            <span class="medal bronze">🥉</span>
          </template>
          <template v-else>
            {{ index + 1 }}
          </template>
        </div>

        <div class="profile-cell">
          <router-link :to="`/profile/${ranking.account}`" class="profile-link text-decoration-none">
            <!-- ProfileRing 컴포넌트 사용 -->
            <ProfileRing
              :profile-image-url="ranking.profileImageUrl"
              :base-score="ranking.baseScore || 0"
              :size="48"
              :stroke-width="3"
              progress-color="#a5d6a7"
              alt-text="프로필 이미지"
            />
          </router-link>
          <div class="user-details">
            <router-link :to="`/profile/${ranking.account}`" class="nickname-link">
              <span :class="{'bold-rank': index < 3}">{{ ranking.userName }}</span>
            </router-link>
            <span class="user-activity">{{ getActivityStatus(ranking.lastActiveDate) }}</span>
          </div>
        </div>

        <div class="score-container">
          <div class="score">
            {{ rankingType === 'total' ? ranking.totalScore : ranking.baseScore }}
          </div>
          <div class="trend" v-if="ranking.trend">
            <span v-if="ranking.trend > 0" class="trend-up">↑ {{ ranking.trend }}</span>
            <span v-else-if="ranking.trend < 0" class="trend-down">↓ {{ Math.abs(ranking.trend) }}</span>
            <span v-else class="trend-same">―</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 데이터가 없을 경우 표시 -->
    <div v-else class="no-rankings animate-on-scroll">
      <p>현재 랭킹 정보가 없습니다.</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ProfileRing from '@/components/profile/ProfileRing.vue';

dayjs.extend(relativeTime);

export default {
  components: {
    ProfileRing
  },
  data() {
    return {
      rankingType: 'total',  // 랭킹 타입 (기본값: total)
      rankings: [],          // 랭킹 데이터를 저장할 배열
      isLoading: false,      // 로딩 상태
    };
  },
  mounted() {
    this.fetchRanking();     // 컴포넌트가 로드될 때 랭킹 데이터를 가져옵니다.
    this.observeFeedAnimation(); // 애니메이션 관찰자 설정
  },
  methods: {
    // 랭킹 타입을 변경하고 데이터를 다시 가져옵니다.
    setRankingType(type) {
      this.rankingType = type;
      this.fetchRanking();   // 새 랭킹 데이터 가져오기
    },

    // 선택된 랭킹 타입에 따라 데이터를 가져오는 함수
    async fetchRanking() {
      this.isLoading = true;
      try {
        const response = await axios.get(`/api/ranking?type=${this.rankingType}&limit=10`);

        // 가상의 트렌드 데이터 추가 (실제 API에서 제공되면 이 부분 제거)
        const newRankings = response.data.map(item => ({
          ...item,
          trend: this.getRandomTrend(), // 실제 API에서는 제거하고 서버에서 제공하는 값 사용
          lastActiveDate: this.getRandomDate() // 실제 API에서는 제거하고 서버에서 제공하는 값 사용
        }));

        this.rankings = newRankings; // 기존 데이터 대체

        this.$nextTick(() => {
          this.observeFeedAnimation(); // 데이터가 로드된 후 애니메이션 다시 설정
        });
      } catch (error) {
        console.error('랭킹 데이터를 불러오는 중 오류가 발생했습니다.', error);
      } finally {
        this.isLoading = false;
      }
    },

    // 스크롤 애니메이션 관찰자 설정
    observeFeedAnimation() {
      const elements = document.querySelectorAll(".animate-on-scroll");
      const scrollObserver = new IntersectionObserver(
          entries => entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add("in-view");
          }),
          {threshold: 0.1}
      );
      elements.forEach(el => scrollObserver.observe(el));
    },

    // 활동 상태 표시 (최근 활동 시간 기준)
    getActivityStatus(date) {
      if (!date) return '';
      return dayjs(date).fromNow();
    },

    // 임시 데이터용 랜덤 트렌드 생성 (실제 구현 시 제거)
    getRandomTrend() {
      const trends = [-2, -1, 0, 1, 2, 3];
      return trends[Math.floor(Math.random() * trends.length)];
    },

    // 임시 데이터용 랜덤 날짜 생성 (실제 구현 시 제거)
    getRandomDate() {
      const days = [0, 1, 2, 3, 4, 5];
      const randomDay = days[Math.floor(Math.random() * days.length)];
      return dayjs().subtract(randomDay, 'day').toISOString();
    }
  }
};
</script>

<style scoped>
/* 기본 레이아웃 및 애니메이션 */
.feed-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

.header {
  font-size: 28px;
  font-weight: bold;
  color: #222;
  text-align: left;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
}

/* 랭킹 옵션 버튼 */
.ranking-options {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.ranking-options button {
  padding: 8px 20px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.ranking-options button.active {
  background-color: #f0f0f0;
  color: #333;
  border-color: #ccc;
  font-weight: bold;
}

.ranking-options button:hover {
  background-color: #f9f9f9;
  transform: translateY(-2px);
}

/* 랭킹 카드 스타일 */
.rankings-container {
  margin-top: 20px;
}

.ranking-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.ranking-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* 상위 랭커(1-3등)에 대한 특별한 호버 효과 */
.ranking-card:nth-child(-n+3) {
  position: relative;
  z-index: 1;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.ranking-card:nth-child(-n+3):hover {
  transform: translateY(-2px) scale(1.025);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* 1등 */
.ranking-card:nth-child(1):hover {
  box-shadow: 0 5px 15px rgba(255, 193, 7, 0.3);
  border-color: #ffc107;
}

/* 2등 */
.ranking-card:nth-child(2):hover {
  box-shadow: 0 5px 15px rgba(57, 73, 171, 0.4);
  border-color: #3949ab;
}

/* 3등 */
.ranking-card:nth-child(3):hover {
  box-shadow: 0 5px 15px rgba(205, 127, 50, 0.3);
  border-color: #cd7f32;
}


.ranking-card:nth-child(-n+3):hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid transparent;
  animation: shine 1.5s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes shine {
  0% {
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
  }
  50% {
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
  }
  100% {
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
  }
}

/* 순위 스타일 */
.rank {
  font-size: 18px;
  font-weight: bold;
  width: 40px;
  text-align: center;
  color: #555;
}

.medal {
  font-size: 24px;
  display: inline-block;
  transform-origin: center;
  animation: pulse 2s infinite;
}

/* 메달 애니메이션 확장 */
@keyframes pulse {
  0% {
    transform: scale(1.0);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1.0);
  }
}

/* 1등 (진한 금색) */
.gold {
  color: #FFD700; /* 황금색 */
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8); /* 진한 빛 효과 */
}

/* 2등 (사파이어 블루) */
.silver {
  color: #3949ab; /* 깊고 차가운 사파이어 블루 */
  text-shadow: 0 0 10px rgba(57, 73, 171, 0.7); /* 고급스러움 강조 */
}

/* 3등 (진한 브론즈) */
.bronze {
  color: #9e7a38; /* 진한 브론즈 색상 */
  text-shadow: 0 0 10px rgba(158, 122, 56, 0.7); /* 깊은 브론즈 느낌 강조 */
}

/* 상위 랭커의 메달 호버 효과 */
.ranking-card:nth-child(1):hover .medal.gold {
  transform: scale(1.3);
  color: #FFD700; /* 황금색 */
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.8); /* 진한 빛 효과 */
  transition: transform 0.4s ease-out;
}

.ranking-card:nth-child(2):hover .medal.silver {
  transform: scale(1.3);
  color: #3949ab;
  text-shadow: 0 0 10px rgba(57, 73, 171, 0.7);
  transition: all 0.4s ease-out;
}

.ranking-card:nth-child(3):hover .medal.bronze {
  transform: scale(1.3);
  color: #9e7a38; /* 진한 브론즈 색상 */
  text-shadow: 0 0 15px rgba(158, 122, 56, 0.7);
  transition: transform 0.4s ease-out;
}

/* 프로필 및 사용자 정보 */
.profile-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
  padding: 0 10px;
}

/* ProfileRing 컴포넌트용 스타일 */
.profile-link {
  text-decoration: none;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.user-activity {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* 점수 및 추세 표시 */
.score-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 70px;
}

.score {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.trend {
  font-size: 12px;
  margin-top: 4px;
}

.trend-up {
  color: #ff6b6b;
}

.trend-down {
  color: #339af0;
}

.trend-same {
  color: #999;
}

/* 닉네임 스타일 */
.nickname-link {
  text-decoration: none;
  color: #333;
  font-size: 16px;
  transition: color 0.3s ease;
}

.nickname-link:hover {
  color: #555;
}

.bold-rank {
  font-weight: 700;
}

/* 더 보기 버튼 */
.load-more-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

.load-more-btn {
  padding: 10px 20px;
  background-color: #fff;
  color: #555;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.load-more-btn:hover:not(:disabled) {
  background-color: #f9f9f9;
  color: #333;
}

.load-more-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 데이터가 없을 경우 스타일 */
.no-rankings {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 1rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-top: 20px;
}
</style>