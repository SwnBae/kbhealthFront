<template>
  <div class="following-ranking-wrapper">
    <!-- 로딩 상태 표시 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
    </div>
    
    <!-- 랭킹 리스트 (가로 스크롤) -->
    <div v-else-if="rankings.length > 0" class="following-ranking-scroll">
      <div class="following-ranking-container" ref="container">
        <!-- index 변수를 사용하지 않으므로 제거 -->
        <div v-for="ranking in rankings" :key="ranking.memberId"
             class="following-rank-item" 
             :class="{'top-rank': ranking.rank <= 3}"
             @click="goToProfile(ranking.account)">
          <div class="rank-badge">
            <template v-if="ranking.rank === 1">
              <span class="medal gold">🥇</span>
            </template>
            <template v-else-if="ranking.rank === 2">
              <span class="medal silver">🥈</span>
            </template>
            <template v-else-if="ranking.rank === 3">
              <span class="medal bronze">🥉</span>
            </template>
            <template v-else>
              {{ ranking.rank }}
            </template>
          </div>
          
          <!-- ProfileRing 컴포넌트 사용 -->
          <ProfileRing
            :profile-image-url="ranking.profileImageUrl || '/images/default_profile.png'"
            :base-score="ranking.baseScore || 0"
            :size="64"
            :stroke-width="3"
            progress-color="#a5d6a7"
            :alt-text="`${ranking.userName} 프로필`"
          />
        </div>
      </div>
    </div>
    
    <!-- 데이터가 없을 경우 표시 -->
    <div v-else class="no-following-rankings">
      <button class="find-friends-btn" @click="goToFindFriends">친구 찾기</button>
    </div>
  </div>
</template>

<script>
import ProfileRing from '@/components/profile/ProfileRing.vue';
import axios from 'axios';

export default {
  components: {
    ProfileRing
  },
  props: {
    showTitle: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      rankings: [],
      isLoading: false,
      currentPage: 0,
      pageSize: 20 // 스크롤 형태이므로 한번에 더 많은 아이템을 가져옵니다
    };
  },
  mounted() {
    this.fetchFollowingRanking();
    this.setupHorizontalScroll();
  },
  methods: {
    // 가로 스크롤 설정
    setupHorizontalScroll() {
      const container = this.$refs.container;
      if (container) {
        container.addEventListener('wheel', (e) => {
          // 기본 스크롤 동작 방지
          e.preventDefault();
          
          // 스크롤 방향에 따라 가로 스크롤 적용
          container.scrollLeft += (e.deltaY + e.deltaX);
        }, { passive: false });
      }
    },
    
    async fetchFollowingRanking() {
      this.isLoading = true;
      try {
        const response = await axios.get(
          `/api/ranking/following?page=${this.currentPage}&size=${this.pageSize}`
        );
        
        const pageData = response.data;
        this.rankings = pageData.content;
        
        // 스크롤 핸들러 설정 (데이터 로드 후)
        this.$nextTick(() => {
          this.setupHorizontalScroll();
        });
        
      } catch (error) {
        console.error('팔로우 랭킹을 불러오는 중 오류가 발생했습니다.', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    // 프로필 페이지로 이동
    goToProfile(account) {
      this.$router.push(`/profile/${account}`);
    },
    
    // 친구 찾기 페이지로 이동
    goToFindFriends() {
      this.$router.push('/find-friends');
    }
  }
};
</script>

<style scoped>
.following-ranking-wrapper {
  position: relative;
  width: 100%;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  padding-left: 8px;
}

/* 가로 스크롤 컨테이너 */
.following-ranking-scroll {
  position: relative;
  overflow: hidden;
  padding: 8px 0;
  width: 100%;
}

.following-ranking-container {
  display: flex;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  padding: 8px 4px 16px 4px;
  width: 100%;
}

/* Webkit 브라우저용 스크롤바 숨기기 */
.following-ranking-container::-webkit-scrollbar {
  display: none;
}

/* 랭킹 아이템 스타일 */
.following-rank-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 10px;
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;
  min-width: 76px;
  flex-shrink: 0;
}

.following-rank-item:hover {
  transform: translateY(-5px);
}

/* 상위 랭킹 강조 */
.following-rank-item.top-rank {
  position: relative;
  z-index: 1;
}

.following-rank-item.top-rank:hover {
  transform: translateY(-5px) scale(1.05);
}

.following-rank-item.top-rank::before {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  background: linear-gradient(45deg, rgba(255,215,0,0.1), rgba(255,255,255,0), rgba(255,215,0,0.1));
  border-radius: 50%;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.following-rank-item.top-rank:hover::before {
  opacity: 1;
}

/* 랭킹 뱃지 */
.rank-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: #fff;
  color: #333;
  font-size: 12px;
  font-weight: bold;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  z-index: 10;
}

.medal {
  font-size: 16px;
}

.gold {
  color: #FFD700;
}

.silver {
  color: #3949ab;
}

.bronze {
  color: #9e7a38;
}

/* 사용자 정보 */
.user-name {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

/* 모든 랭킹 보기 버튼 */
.see-all-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 76px;
  margin: 0 10px;
  cursor: pointer;
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.see-all-button:hover {
  transform: translateY(-5px);
}

.see-all-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
}

.see-all-text {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
}

/* 로딩 스타일 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 팔로우 데이터 없음 스타일 */
.no-following-rankings {
  text-align: center;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  color: #666;
}

.find-friends-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.find-friends-btn:hover {
  background-color: #45a049;
}
</style>