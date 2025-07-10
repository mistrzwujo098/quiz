// ===== MODUŁ ROZSZERZONEJ GAMIFIKACJI =====
// Zaawansowany system motywacji z levelami, questami i nagrodami

class ExtendedGamificationSystem {
  constructor() {
    this.playerData = this.loadPlayerData();
    this.gameConfig = this.loadGameConfig();
    this.activeQuests = [];
    this.dailyChallenges = [];
    this.seasonPass = null;
    // Nie inicjalizuj tutaj - zrób to po załadowaniu DOM
  }

  /**
   * Inicjalizuje system gamifikacji
   */
  initializeSystem() {
    this.loadActiveQuests();
    this.generateDailyChallenges();
    this.checkSeasonPass();
    this.initializeBattlePass();
    this.setupEventListeners();
  }

  /**
   * System poziomów i doświadczenia
   */
  calculateLevel(xp) {
    // Progresywna krzywa doświadczenia
    let level = 1;
    let requiredXP = 100;
    let totalRequired = 0;

    while (xp >= totalRequired + requiredXP) {
      totalRequired += requiredXP;
      level++;
      requiredXP = Math.floor(100 * Math.pow(1.15, level - 1));
    }

    return {
      level,
      currentXP: xp - totalRequired,
      requiredXP,
      progress: ((xp - totalRequired) / requiredXP) * 100
    };
  }

  /**
   * Przyznaje doświadczenie
   */
  awardXP(amount, source) {
    const multiplier = this.getXPMultiplier();
    const bonusXP = Math.floor(amount * multiplier);
    const totalXP = amount + bonusXP;

    const oldLevel = this.calculateLevel(this.playerData.totalXP);
    this.playerData.totalXP += totalXP;
    this.playerData.weeklyXP += totalXP;
    const newLevel = this.calculateLevel(this.playerData.totalXP);

    // Zapisz historię XP
    this.playerData.xpHistory.push({
      amount: totalXP,
      source,
      multiplier,
      timestamp: new Date()
    });

    // Sprawdź level up
    if (newLevel.level > oldLevel.level) {
      this.onLevelUp(oldLevel.level, newLevel.level);
    }

    // Aktualizuj questy
    this.updateQuestProgress('earnXP', totalXP);
    
    this.savePlayerData();
    this.showXPGain(amount, bonusXP, source);
    
    return totalXP;
  }

  /**
   * Obsługa awansu na wyższy poziom
   */
  onLevelUp(oldLevel, newLevel) {
    const rewards = this.getLevelRewards(newLevel);
    
    // Przyznaj nagrody
    rewards.forEach(reward => {
      this.grantReward(reward);
    });

    // Odblokuj nowe funkcje
    this.unlockFeatures(newLevel);

    // Pokaż animację level up
    this.showLevelUpAnimation(oldLevel, newLevel, rewards);

    // Zapisz osiągnięcie
    if (window.achievementsSystem) {
      window.achievementsSystem.checkAchievement('reachLevel', newLevel);
    }

    // Powiadomienie
    if (window.pushNotifications) {
      window.pushNotifications.showNotification(
        `🎉 Awans na poziom ${newLevel}!`,
        {
          body: `Gratulacje! Odbierz swoje nagrody.`,
          icon: '/icons/level-up.png',
          tag: 'level-up'
        }
      );
    }
  }

  /**
   * System questów (zadań)
   */
  loadActiveQuests() {
    const availableQuests = this.getAvailableQuests();
    
    // Dodaj nowe questy jeśli jest miejsce
    const maxQuests = 3 + Math.floor(this.playerData.level / 10);
    while (this.activeQuests.length < maxQuests && availableQuests.length > 0) {
      const quest = availableQuests.shift();
      this.activeQuests.push({
        ...quest,
        startedAt: new Date(),
        progress: 0,
        completed: false
      });
    }
  }

  getAvailableQuests() {
    const playerLevel = this.calculateLevel(this.playerData.totalXP).level;
    
    return [
      {
        id: 'perfectionist',
        name: 'Perfekcjonista',
        description: 'Zdobądź 100% w 3 egzaminach',
        type: 'achievement',
        target: 3,
        rewards: { xp: 500, coins: 100, badge: 'perfect_scorer' },
        requiredLevel: 1
      },
      {
        id: 'speedrunner',
        name: 'Błyskawica',
        description: 'Ukończ 5 egzaminów w mniej niż 5 minut każdy',
        type: 'speed',
        target: 5,
        rewards: { xp: 750, coins: 150, powerup: 'time_freeze' },
        requiredLevel: 5
      },
      {
        id: 'marathon',
        name: 'Maraton nauki',
        description: 'Ucz się przez 7 dni z rzędu',
        type: 'streak',
        target: 7,
        rewards: { xp: 1000, coins: 200, title: 'Wytrwały' },
        requiredLevel: 3
      },
      {
        id: 'explorer',
        name: 'Odkrywca',
        description: 'Wypróbuj wszystkie kategorie przedmiotów',
        type: 'variety',
        target: 6,
        rewards: { xp: 600, coins: 120, avatar: 'explorer' },
        requiredLevel: 2
      },
      {
        id: 'helper',
        name: 'Pomocna dłoń',
        description: 'Udostępnij 10 zestawów zadań',
        type: 'social',
        target: 10,
        rewards: { xp: 800, coins: 160, badge: 'community_hero' },
        requiredLevel: 8
      },
      {
        id: 'comeback_king',
        name: 'Król powrotów',
        description: 'Popraw 5 egzaminów z wynikiem lepszym o 20%',
        type: 'improvement',
        target: 5,
        rewards: { xp: 900, coins: 180, powerup: 'second_chance' },
        requiredLevel: 4
      }
    ].filter(quest => quest.requiredLevel <= playerLevel && 
             !this.playerData.completedQuests.includes(quest.id));
  }

  updateQuestProgress(type, value) {
    this.activeQuests.forEach(quest => {
      if (quest.completed) return;

      let progressMade = false;

      switch (quest.type) {
        case 'achievement':
          if (type === 'perfectScore') {
            quest.progress++;
            progressMade = true;
          }
          break;
        
        case 'speed':
          if (type === 'fastCompletion' && value < 300) { // < 5 minut
            quest.progress++;
            progressMade = true;
          }
          break;
        
        case 'streak':
          if (type === 'dailyLogin') {
            quest.progress = value;
            progressMade = true;
          }
          break;
        
        case 'variety':
          if (type === 'newCategory') {
            quest.progress++;
            progressMade = true;
          }
          break;
      }

      if (progressMade && quest.progress >= quest.target) {
        this.completeQuest(quest);
      }
    });

    this.saveActiveQuests();
  }

  completeQuest(quest) {
    quest.completed = true;
    quest.completedAt = new Date();
    
    // Przyznaj nagrody
    Object.entries(quest.rewards).forEach(([type, value]) => {
      this.grantReward({ type, value });
    });

    // Zapisz jako ukończony
    this.playerData.completedQuests.push(quest.id);
    
    // Pokaż powiadomienie
    this.showQuestComplete(quest);
    
    // Usuń z aktywnych i dodaj nowy
    setTimeout(() => {
      this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
      this.loadActiveQuests();
    }, 3000);
  }

  /**
   * Codzienne wyzwania
   */
  generateDailyChallenges() {
    const today = new Date().toDateString();
    const lastGenerated = localStorage.getItem('lastChallengesDate');
    
    if (lastGenerated === today) {
      this.dailyChallenges = JSON.parse(localStorage.getItem('dailyChallenges') || '[]');
      return;
    }

    const challenges = [
      {
        id: 'daily_streak',
        name: 'Codzienna dawka nauki',
        description: 'Ukończ przynajmniej 1 egzamin',
        reward: { xp: 100, coins: 20 },
        progress: 0,
        target: 1,
        completed: false
      },
      {
        id: 'daily_accuracy',
        name: 'Celne oko',
        description: 'Uzyskaj średnią 80% z 3 egzaminów',
        reward: { xp: 200, coins: 40 },
        progress: 0,
        target: 3,
        completed: false
      },
      {
        id: 'daily_time',
        name: 'Wytrwałość',
        description: 'Spędź 30 minut na nauce',
        reward: { xp: 150, coins: 30 },
        progress: 0,
        target: 30,
        completed: false
      }
    ];

    // Losuj 2-3 wyzwania
    const numChallenges = Math.random() > 0.5 ? 3 : 2;
    this.dailyChallenges = this.shuffleArray(challenges).slice(0, numChallenges);
    
    localStorage.setItem('dailyChallenges', JSON.stringify(this.dailyChallenges));
    localStorage.setItem('lastChallengesDate', today);
  }

  /**
   * Battle Pass / Season Pass
   */
  initializeBattlePass() {
    const currentSeason = this.getCurrentSeason();
    
    if (!this.playerData.battlePass || this.playerData.battlePass.season !== currentSeason.id) {
      this.playerData.battlePass = {
        season: currentSeason.id,
        tier: 1,
        xp: 0,
        premium: false,
        claimedRewards: []
      };
    }

    this.seasonPass = {
      ...currentSeason,
      playerTier: this.playerData.battlePass.tier,
      playerXP: this.playerData.battlePass.xp
    };
  }

  getCurrentSeason() {
    const seasons = {
      'winter2024': {
        id: 'winter2024',
        name: 'Zimowa Nauka',
        theme: 'winter',
        startDate: '2024-12-01',
        endDate: '2025-02-28',
        tiers: this.generateSeasonTiers('winter')
      },
      'spring2025': {
        id: 'spring2025',
        name: 'Wiosenny Rozkwit',
        theme: 'spring',
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        tiers: this.generateSeasonTiers('spring')
      }
    };

    const now = new Date();
    for (const [id, season] of Object.entries(seasons)) {
      const start = new Date(season.startDate);
      const end = new Date(season.endDate);
      if (now >= start && now <= end) {
        return season;
      }
    }

    // Domyślny sezon
    return seasons.winter2024;
  }

  generateSeasonTiers(theme) {
    const tiers = [];
    const themeRewards = {
      winter: ['snowflake_badge', 'ice_crown', 'polar_bear_pet'],
      spring: ['flower_badge', 'butterfly_wings', 'bunny_pet']
    };

    for (let i = 1; i <= 50; i++) {
      const rewards = {
        free: [],
        premium: []
      };

      // Co 5 poziomów - większa nagroda
      if (i % 5 === 0) {
        rewards.free.push({ type: 'coins', value: 100 * (i / 5) });
        rewards.premium.push({ type: 'coins', value: 200 * (i / 5) });
        
        if (i % 10 === 0) {
          const themeIndex = (i / 10) - 1;
          if (themeRewards[theme][themeIndex]) {
            rewards.premium.push({ 
              type: 'cosmetic', 
              value: themeRewards[theme][themeIndex] 
            });
          }
        }
      } else {
        rewards.free.push({ type: 'xp', value: 50 * i });
        rewards.premium.push({ type: 'xp', value: 100 * i });
      }

      tiers.push({
        tier: i,
        requiredXP: i * 1000,
        rewards
      });
    }

    return tiers;
  }

  /**
   * System monet i sklepu
   */
  spendCoins(amount) {
    if (this.playerData.coins >= amount) {
      this.playerData.coins -= amount;
      this.savePlayerData();
      return true;
    }
    return false;
  }

  purchaseItem(itemId) {
    const item = this.shopItems[itemId];
    if (!item) return false;

    if (this.spendCoins(item.cost)) {
      switch (item.type) {
        case 'powerup':
          this.playerData.powerups[itemId] = (this.playerData.powerups[itemId] || 0) + 1;
          break;
        
        case 'cosmetic':
          this.playerData.cosmetics.push(itemId);
          break;
        
        case 'boost':
          this.activateBoost(item.effect);
          break;
      }

      this.showPurchaseSuccess(item);
      return true;
    }

    this.showInsufficientFunds();
    return false;
  }

  /**
   * Power-upy i boosty
   */
  usePowerup(powerupId) {
    if (this.playerData.powerups[powerupId] > 0) {
      this.playerData.powerups[powerupId]--;
      
      const effects = {
        'time_freeze': () => this.activateTimeFreeze(),
        'second_chance': () => this.activateSecondChance(),
        'hint_master': () => this.activateHintMaster(),
        'xp_doubler': () => this.activateXPDoubler(),
        'streak_shield': () => this.activateStreakShield()
      };

      if (effects[powerupId]) {
        effects[powerupId]();
        this.savePlayerData();
        return true;
      }
    }
    return false;
  }

  activateTimeFreeze() {
    // Zatrzymaj timer na 30 sekund
    this.activeEffects.timeFreeze = {
      duration: 30000,
      startedAt: Date.now()
    };
    this.showPowerupActivated('Czas zatrzymany na 30 sekund!');
  }

  activateSecondChance() {
    // Pozwól na jedną dodatkową odpowiedź
    this.activeEffects.secondChance = true;
    this.showPowerupActivated('Druga szansa aktywna!');
  }

  activateXPDoubler() {
    // Podwój XP na następną godzinę
    this.activeEffects.xpDoubler = {
      multiplier: 2,
      expiresAt: Date.now() + 3600000
    };
    this.showPowerupActivated('Podwójne XP przez godzinę!');
  }

  /**
   * System ligowy
   */
  updateLeagueProgress(examScore) {
    const league = this.playerData.league;
    
    // Punkty ligowe za wynik
    const points = Math.floor(examScore * 10);
    league.points += points;
    
    // Sprawdź awans/spadek
    if (league.points >= this.getLeagueThreshold(league.tier, 'promotion')) {
      this.promoteLeague();
    } else if (league.points <= this.getLeagueThreshold(league.tier, 'demotion')) {
      this.demoteLeague();
    }
    
    this.updateLeagueRanking();
  }

  getLeagueThreshold(tier, type) {
    const thresholds = {
      bronze: { promotion: 1000, demotion: 0 },
      silver: { promotion: 2500, demotion: 800 },
      gold: { promotion: 5000, demotion: 2000 },
      platinum: { promotion: 10000, demotion: 4000 },
      diamond: { promotion: 20000, demotion: 8000 },
      master: { promotion: Infinity, demotion: 15000 }
    };
    
    return thresholds[tier]?.[type] || 0;
  }

  /**
   * Komponenty UI
   */
  renderGamificationHub() {
    return `
      <div class="gamification-hub">
        <!-- Pasek postępu gracza -->
        <div class="player-progress-bar">
          <div class="level-badge">
            <i class="fas fa-star"></i>
            <span class="level-number">${this.calculateLevel(this.playerData.totalXP).level}</span>
          </div>
          <div class="xp-progress">
            <div class="xp-fill" style="width: ${this.calculateLevel(this.playerData.totalXP).progress}%"></div>
            <span class="xp-text">
              ${this.calculateLevel(this.playerData.totalXP).currentXP} / 
              ${this.calculateLevel(this.playerData.totalXP).requiredXP} XP
            </span>
          </div>
          <div class="currency-display">
            <i class="fas fa-coins"></i>
            <span>${this.playerData.coins}</span>
          </div>
        </div>

        <!-- Zakładki -->
        <div class="hub-tabs">
          <button class="hub-tab active" onclick="gamification.showTab('quests')">
            <i class="fas fa-scroll"></i> Zadania
          </button>
          <button class="hub-tab" onclick="gamification.showTab('daily')">
            <i class="fas fa-calendar-day"></i> Dzienne
          </button>
          <button class="hub-tab" onclick="gamification.showTab('battlepass')">
            <i class="fas fa-ticket-alt"></i> Karnet
          </button>
          <button class="hub-tab" onclick="gamification.showTab('shop')">
            <i class="fas fa-store"></i> Sklep
          </button>
          <button class="hub-tab" onclick="gamification.showTab('league')">
            <i class="fas fa-trophy"></i> Liga
          </button>
        </div>

        <!-- Zawartość -->
        <div id="gamification-content">
          ${this.renderQuestsTab()}
        </div>
      </div>
    `;
  }

  renderQuestsTab() {
    return `
      <div class="quests-container">
        <h2>Aktywne zadania</h2>
        <div class="quest-list">
          ${this.activeQuests.map(quest => this.renderQuestCard(quest)).join('')}
        </div>
        
        ${this.activeQuests.length === 0 ? `
          <div class="no-quests">
            <i class="fas fa-scroll"></i>
            <p>Brak dostępnych zadań. Wróć później!</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderQuestCard(quest) {
    const progressPercentage = (quest.progress / quest.target) * 100;
    
    return `
      <div class="quest-card ${quest.completed ? 'completed' : ''}">
        <div class="quest-header">
          <h3>${quest.name}</h3>
          ${quest.completed ? '<i class="fas fa-check-circle"></i>' : ''}
        </div>
        
        <p class="quest-description">${quest.description}</p>
        
        <div class="quest-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
          </div>
          <span class="progress-text">${quest.progress} / ${quest.target}</span>
        </div>
        
        <div class="quest-rewards">
          <span class="rewards-label">Nagrody:</span>
          ${Object.entries(quest.rewards).map(([type, value]) => `
            <span class="reward-item">
              <i class="fas fa-${this.getRewardIcon(type)}"></i>
              ${value}
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderDailyTab() {
    const resetTime = this.getTimeUntilReset();
    
    return `
      <div class="daily-container">
        <div class="daily-header">
          <h2>Codzienne wyzwania</h2>
          <div class="reset-timer">
            <i class="fas fa-clock"></i>
            Reset za: ${resetTime}
          </div>
        </div>
        
        <div class="challenge-list">
          ${this.dailyChallenges.map(challenge => this.renderChallengeCard(challenge)).join('')}
        </div>
        
        <div class="daily-bonus">
          <h3>Bonus za serię dni</h3>
          <div class="streak-calendar">
            ${this.renderStreakCalendar()}
          </div>
          <p class="streak-info">
            Obecna seria: <strong>${this.playerData.loginStreak} dni</strong>
          </p>
        </div>
      </div>
    `;
  }

  renderBattlePassTab() {
    if (!this.seasonPass) return '<p>Karnet sezonowy niedostępny</p>';
    
    const currentTier = this.playerData.battlePass.tier;
    const isPremium = this.playerData.battlePass.premium;
    
    return `
      <div class="battlepass-container">
        <div class="season-header">
          <h2>${this.seasonPass.name}</h2>
          <div class="season-timer">
            <i class="fas fa-hourglass-half"></i>
            Koniec za: ${this.getDaysUntilSeasonEnd()} dni
          </div>
        </div>
        
        ${!isPremium ? `
          <div class="premium-banner">
            <h3>Odblokuj Premium Pass!</h3>
            <p>Zdobądź ekskluzywne nagrody i bonusy</p>
            <button class="btn-premium" onclick="gamification.purchasePremiumPass()">
              <i class="fas fa-crown"></i> Kup za 500 monet
            </button>
          </div>
        ` : ''}
        
        <div class="tier-track">
          ${this.seasonPass.tiers.slice(0, 10).map(tier => `
            <div class="tier-item ${tier.tier === currentTier ? 'current' : ''} 
                        ${tier.tier < currentTier ? 'completed' : ''}">
              <div class="tier-number">${tier.tier}</div>
              
              <div class="tier-rewards">
                <div class="free-rewards">
                  ${tier.rewards.free.map(r => this.renderRewardIcon(r)).join('')}
                </div>
                ${isPremium ? `
                  <div class="premium-rewards">
                    ${tier.rewards.premium.map(r => this.renderRewardIcon(r)).join('')}
                  </div>
                ` : ''}
              </div>
              
              ${tier.tier === currentTier && !this.hasClaimedTierReward(tier.tier) ? `
                <button class="claim-reward" onclick="gamification.claimTierReward(${tier.tier})">
                  Odbierz
                </button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderShopTab() {
    return `
      <div class="shop-container">
        <div class="shop-header">
          <h2>Sklep</h2>
          <div class="player-coins">
            <i class="fas fa-coins"></i>
            <span>${this.playerData.coins}</span>
          </div>
        </div>
        
        <div class="shop-categories">
          <button class="category-btn active" onclick="gamification.filterShop('all')">
            Wszystko
          </button>
          <button class="category-btn" onclick="gamification.filterShop('powerups')">
            Power-upy
          </button>
          <button class="category-btn" onclick="gamification.filterShop('cosmetics')">
            Wygląd
          </button>
          <button class="category-btn" onclick="gamification.filterShop('boosts')">
            Boosty
          </button>
        </div>
        
        <div class="shop-grid">
          ${Object.entries(this.shopItems).map(([id, item]) => `
            <div class="shop-item" data-category="${item.category}">
              <div class="item-icon">
                <i class="fas fa-${item.icon}"></i>
              </div>
              <h4>${item.name}</h4>
              <p>${item.description}</p>
              <div class="item-price">
                <i class="fas fa-coins"></i> ${item.cost}
              </div>
              <button class="buy-btn" 
                      onclick="gamification.purchaseItem('${id}')"
                      ${this.playerData.coins < item.cost ? 'disabled' : ''}>
                ${this.playerData.coins >= item.cost ? 'Kup' : 'Za mało monet'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderLeagueTab() {
    const league = this.playerData.league;
    const leaderboard = this.getLeagueLeaderboard();
    
    return `
      <div class="league-container">
        <div class="league-header">
          <div class="current-league">
            <i class="fas fa-shield-alt league-icon ${league.tier}"></i>
            <div class="league-info">
              <h3>Liga ${this.getLeagueName(league.tier)}</h3>
              <p>${league.points} punktów</p>
            </div>
          </div>
          
          <div class="league-progress">
            <div class="promotion-zone">
              <span>Awans: ${this.getLeagueThreshold(league.tier, 'promotion')} pkt</span>
            </div>
            <div class="demotion-zone">
              <span>Spadek: ${this.getLeagueThreshold(league.tier, 'demotion')} pkt</span>
            </div>
          </div>
        </div>
        
        <div class="leaderboard">
          <h3>Ranking ligowy</h3>
          <div class="leaderboard-list">
            ${leaderboard.map((player, index) => `
              <div class="leaderboard-item ${player.id === this.playerData.id ? 'current-player' : ''}">
                <span class="rank">${index + 1}</span>
                <div class="player-info">
                  <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
                  <span class="player-name">${player.name}</span>
                </div>
                <span class="player-points">${player.points} pkt</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="league-rewards">
          <h3>Nagrody końca sezonu</h3>
          <div class="reward-tiers">
            ${this.getLeagueRewards(league.tier).map((reward, index) => `
              <div class="reward-tier">
                <span class="position">Top ${index + 1}</span>
                <div class="rewards">
                  ${Object.entries(reward).map(([type, value]) => `
                    <span class="reward">
                      <i class="fas fa-${this.getRewardIcon(type)}"></i> ${value}
                    </span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Animacje i efekty wizualne
   */
  showXPGain(baseXP, bonusXP, source) {
    const notification = document.createElement('div');
    notification.className = 'xp-notification';
    notification.innerHTML = `
      <div class="xp-amount">+${baseXP} XP</div>
      ${bonusXP > 0 ? `<div class="xp-bonus">+${bonusXP} bonus!</div>` : ''}
      <div class="xp-source">${source}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  }

  showLevelUpAnimation(oldLevel, newLevel, rewards) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `
      <div class="level-up-content">
        <div class="level-up-header">
          <h1>AWANS NA POZIOM!</h1>
          <div class="level-display">
            <span class="old-level">${oldLevel}</span>
            <i class="fas fa-arrow-right"></i>
            <span class="new-level">${newLevel}</span>
          </div>
        </div>
        
        <div class="level-up-rewards">
          <h2>Nagrody:</h2>
          <div class="rewards-list">
            ${rewards.map(reward => `
              <div class="reward-item animate-in">
                <i class="fas fa-${this.getRewardIcon(reward.type)}"></i>
                <span>${reward.value} ${this.getRewardName(reward.type)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <button class="close-btn" onclick="this.closest('.level-up-overlay').remove()">
          Świetnie!
        </button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Animacja
    setTimeout(() => {
      overlay.classList.add('show');
      this.playLevelUpSound();
      this.createConfetti();
    }, 10);
  }

  createConfetti() {
    const colors = ['#7c3aed', '#a855f7', '#c084fc', '#e9d5ff'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
      
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 5000);
    }
  }

  /**
   * Pomocnicze metody
   */
  getXPMultiplier() {
    let multiplier = 1;
    
    // Bonus za serię dni
    if (this.playerData.loginStreak >= 7) {
      multiplier += 0.1;
    }
    
    // Bonus premium
    if (this.playerData.battlePass?.premium) {
      multiplier += 0.2;
    }
    
    // Aktywny booster
    if (this.activeEffects.xpDoubler?.expiresAt > Date.now()) {
      multiplier *= this.activeEffects.xpDoubler.multiplier;
    }
    
    // Weekend bonus
    const day = new Date().getDay();
    if (day === 0 || day === 6) {
      multiplier += 0.15;
    }
    
    return multiplier;
  }

  getRewardIcon(type) {
    const icons = {
      xp: 'star',
      coins: 'coins',
      badge: 'medal',
      title: 'crown',
      powerup: 'bolt',
      cosmetic: 'palette',
      avatar: 'user-circle',
      pet: 'paw'
    };
    return icons[type] || 'gift';
  }

  getRewardName(type) {
    const names = {
      xp: 'XP',
      coins: 'monet',
      badge: 'odznaka',
      title: 'tytuł',
      powerup: 'power-up',
      cosmetic: 'wygląd',
      avatar: 'awatar',
      pet: 'zwierzak'
    };
    return names[type] || type;
  }

  getLeagueName(tier) {
    const names = {
      bronze: 'Brązowa',
      silver: 'Srebrna',
      gold: 'Złota',
      platinum: 'Platynowa',
      diamond: 'Diamentowa',
      master: 'Mistrzowska'
    };
    return names[tier] || tier;
  }

  grantReward(reward) {
    switch (reward.type) {
      case 'xp':
        this.awardXP(reward.value, 'Level reward');
        break;
      case 'coins':
        this.playerData.coins += reward.value;
        break;
      case 'badge':
        this.playerData.badges.push(reward.value);
        break;
      case 'title':
        this.playerData.titles.push(reward.value);
        break;
      case 'powerup':
        this.playerData.powerups[reward.value] = 
          (this.playerData.powerups[reward.value] || 0) + 1;
        break;
      case 'cosmetic':
        this.playerData.cosmetics.push(reward.value);
        break;
    }
    this.savePlayerData();
  }

  loadPlayerData() {
    const defaults = {
      id: 'player_' + Date.now(),
      totalXP: 0,
      weeklyXP: 0,
      level: 1,
      coins: 100,
      badges: [],
      titles: ['Początkujący'],
      cosmetics: [],
      powerups: {},
      completedQuests: [],
      xpHistory: [],
      loginStreak: 0,
      lastLogin: null,
      battlePass: null,
      league: {
        tier: 'bronze',
        points: 0,
        rank: null
      }
    };
    
    const saved = localStorage.getItem('gamificationPlayerData');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  }

  savePlayerData() {
    localStorage.setItem('gamificationPlayerData', JSON.stringify(this.playerData));
  }

  loadGameConfig() {
    return {
      xpPerExam: 100,
      xpPerPerfectScore: 50,
      coinsPerExam: 10,
      streakBonus: 10,
      levelRewards: {
        5: [{ type: 'coins', value: 500 }, { type: 'badge', value: 'novice' }],
        10: [{ type: 'coins', value: 1000 }, { type: 'title', value: 'Uczeń' }],
        20: [{ type: 'coins', value: 2000 }, { type: 'cosmetic', value: 'golden_frame' }],
        50: [{ type: 'coins', value: 5000 }, { type: 'title', value: 'Mistrz' }]
      }
    };
  }

  saveActiveQuests() {
    localStorage.setItem('activeQuests', JSON.stringify(this.activeQuests));
  }

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  getTimeUntilReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    return `${hours}g ${minutes}min`;
  }

  getDaysUntilSeasonEnd() {
    const end = new Date(this.seasonPass.endDate);
    const now = new Date();
    const diff = end - now;
    return Math.ceil(diff / 86400000);
  }

  playLevelUpSound() {
    // Odtwórz dźwięk level up
    const audio = new Audio('/sounds/level-up.mp3');
    audio.play().catch(() => {});
  }

  setupEventListeners() {
    // Nasłuchuj na różne wydarzenia w aplikacji
    document.addEventListener('examCompleted', (e) => {
      const { score, duration, examId } = e.detail;
      
      // Podstawowe XP za ukończenie
      this.awardXP(this.gameConfig.xpPerExam, 'Ukończenie egzaminu');
      
      // Bonus za doskonały wynik
      if (score === 100) {
        this.awardXP(this.gameConfig.xpPerPerfectScore, 'Doskonały wynik');
        this.updateQuestProgress('perfectScore', 1);
      }
      
      // Bonus za szybkość
      if (duration < 300) { // < 5 minut
        this.updateQuestProgress('fastCompletion', duration);
      }
      
      // Monety
      const coins = Math.floor(this.gameConfig.coinsPerExam * (score / 100));
      this.playerData.coins += coins;
      
      // Aktualizuj ligę
      this.updateLeagueProgress(score);
      
      // Aktualizuj codzienne wyzwania
      this.updateDailyChallenges('exam', { score, duration });
      
      this.savePlayerData();
    });

    document.addEventListener('dayChanged', () => {
      this.handleDailyReset();
    });
  }

  handleDailyReset() {
    // Sprawdź serię logowań
    const lastLogin = this.playerData.lastLogin ? new Date(this.playerData.lastLogin) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (lastLogin) {
      const lastLoginDate = new Date(lastLogin);
      lastLoginDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today - lastLoginDate) / 86400000);
      
      if (daysDiff === 1) {
        this.playerData.loginStreak++;
      } else if (daysDiff > 1) {
        this.playerData.loginStreak = 1;
      }
    } else {
      this.playerData.loginStreak = 1;
    }
    
    this.playerData.lastLogin = new Date();
    
    // Bonus za serię
    if (this.playerData.loginStreak % 7 === 0) {
      const bonus = this.playerData.loginStreak * this.gameConfig.streakBonus;
      this.playerData.coins += bonus;
      this.showStreakBonus(this.playerData.loginStreak, bonus);
    }
    
    // Generuj nowe codzienne wyzwania
    this.generateDailyChallenges();
    
    // Reset tygodniowego XP w poniedziałek
    if (today.getDay() === 1) {
      this.playerData.weeklyXP = 0;
    }
    
    this.savePlayerData();
  }

  showStreakBonus(days, coins) {
    const notification = document.createElement('div');
    notification.className = 'streak-bonus-notification';
    notification.innerHTML = `
      <i class="fas fa-fire"></i>
      <h3>Seria ${days} dni!</h3>
      <p>Bonus: +${coins} monet</p>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => notification.remove(), 500);
    }, 4000);
  }

  // Dane sklepu
  shopItems = {
    'time_freeze': {
      name: 'Zatrzymanie czasu',
      description: 'Zatrzymaj timer na 30 sekund',
      icon: 'clock',
      cost: 50,
      type: 'powerup',
      category: 'powerups'
    },
    'second_chance': {
      name: 'Druga szansa',
      description: 'Popraw jedną błędną odpowiedź',
      icon: 'redo',
      cost: 75,
      type: 'powerup',
      category: 'powerups'
    },
    'hint_master': {
      name: 'Mistrz podpowiedzi',
      description: '3 darmowe podpowiedzi',
      icon: 'lightbulb',
      cost: 60,
      type: 'powerup',
      category: 'powerups'
    },
    'xp_boost_1h': {
      name: 'XP Boost (1h)',
      description: 'Podwójne XP przez godzinę',
      icon: 'rocket',
      cost: 100,
      type: 'boost',
      category: 'boosts'
    },
    'golden_frame': {
      name: 'Złota ramka',
      description: 'Ekskluzywna ramka awatara',
      icon: 'portrait',
      cost: 200,
      type: 'cosmetic',
      category: 'cosmetics'
    },
    'rainbow_trail': {
      name: 'Tęczowy ślad',
      description: 'Kolorowy efekt przy odpowiedziach',
      icon: 'rainbow',
      cost: 150,
      type: 'cosmetic',
      category: 'cosmetics'
    }
  };

  activeEffects = {};

  /**
   * Renderuje pełny dashboard gamifikacji
   */
  renderFullDashboard() {
    const levelInfo = this.calculateLevel(this.playerData.totalXP);
    
    return `
      <div class="gamification-dashboard">
        <!-- Podsumowanie gracza -->
        <div class="player-summary card-modern mb-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="avatar-frame ${this.playerData.avatarFrame || 'default'}">
                <img src="${this.playerData.avatar || '/api/placeholder/64/64'}" alt="Avatar" 
                     class="w-16 h-16 rounded-full">
              </div>
              <div>
                <h3 class="text-xl font-bold">${this.playerData.username || 'Gracz'}</h3>
                <p class="text-gray-400">Poziom ${levelInfo.level} • ${this.playerData.title || 'Początkujący'}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-purple-400">${this.playerData.totalXP} XP</p>
              <p class="text-sm text-gray-400">${levelInfo.currentXP}/${levelInfo.requiredXP} do następnego poziomu</p>
            </div>
          </div>
          
          <!-- Pasek postępu -->
          <div class="mt-4 bg-gray-700 rounded-full h-4 overflow-hidden">
            <div class="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-500"
                 style="width: ${levelInfo.progress}%"></div>
          </div>
        </div>

        <!-- Zakładki -->
        <div class="tabs mb-6">
          <button class="tab-button active" onclick="window.extendedGamification.showTab('overview')">
            <i class="fas fa-chart-line mr-2"></i>Przegląd
          </button>
          <button class="tab-button" onclick="window.extendedGamification.showTab('quests')">
            <i class="fas fa-scroll mr-2"></i>Questy
          </button>
          <button class="tab-button" onclick="window.extendedGamification.showTab('achievements')">
            <i class="fas fa-trophy mr-2"></i>Osiągnięcia
          </button>
          <button class="tab-button" onclick="window.extendedGamification.showTab('battlepass')">
            <i class="fas fa-ticket-alt mr-2"></i>Karnet
          </button>
          <button class="tab-button" onclick="window.extendedGamification.showTab('shop')">
            <i class="fas fa-store mr-2"></i>Sklep
          </button>
          <button class="tab-button" onclick="window.extendedGamification.showTab('leaderboard')">
            <i class="fas fa-crown mr-2"></i>Ranking
          </button>
        </div>

        <!-- Zawartość zakładek -->
        <div id="gamification-tab-content">
          ${this.renderOverviewTab()}
        </div>
      </div>
    `;
  }

  /**
   * Zmienia aktywną zakładkę
   */
  showTab(tabName) {
    const content = document.getElementById('gamification-tab-content');
    if (!content) return;

    // Aktualizuj przyciski zakładek
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.closest('.tab-button').classList.add('active');

    // Renderuj zawartość
    switch(tabName) {
      case 'overview':
        content.innerHTML = this.renderOverviewTab();
        break;
      case 'quests':
        content.innerHTML = this.renderQuestsTab();
        break;
      case 'achievements':
        content.innerHTML = this.renderAchievementsTab();
        break;
      case 'battlepass':
        content.innerHTML = this.renderBattlePassTab();
        break;
      case 'shop':
        content.innerHTML = this.renderShopTab();
        break;
      case 'leaderboard':
        content.innerHTML = this.renderLeaderboardTab();
        break;
    }
  }
}

// Eksportuj moduł
window.ExtendedGamificationSystem = ExtendedGamificationSystem;

// Style CSS
const gamificationStyles = `
<style>
/* Gamification Hub */
.gamification-hub {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Player Progress Bar */
.player-progress-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.level-badge {
  position: relative;
  width: 60px;
  height: 60px;
  background: var(--accent-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.level-badge i {
  font-size: 20px;
  margin-bottom: 2px;
}

.level-number {
  font-size: 18px;
}

.xp-progress {
  flex: 1;
  position: relative;
  height: 24px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  overflow: hidden;
}

.xp-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--accent-gradient);
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
}

.xp-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.currency-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-tertiary);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  color: #fbbf24;
}

/* Hub Tabs */
.hub-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.hub-tab {
  padding: 12px 24px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hub-tab:hover {
  background: var(--bg-tertiary);
  transform: translateY(-2px);
}

.hub-tab.active {
  background: var(--accent-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

/* Quest Cards */
.quest-list {
  display: grid;
  gap: 20px;
}

.quest-card {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s;
}

.quest-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: var(--accent-primary);
}

.quest-card.completed {
  background: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
}

.quest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.quest-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.quest-header i {
  font-size: 24px;
  color: #22c55e;
}

.quest-description {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.quest-progress {
  margin-bottom: 16px;
}

.quest-rewards {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.rewards-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: var(--bg-tertiary);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.reward-item i {
  color: var(--accent-primary);
}

/* Daily Challenges */
.daily-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.reset-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
}

.challenge-list {
  display: grid;
  gap: 16px;
  margin-bottom: 32px;
}

.challenge-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.challenge-icon {
  width: 48px;
  height: 48px;
  background: var(--accent-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.challenge-info {
  flex: 1;
}

.challenge-info h4 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.challenge-info p {
  font-size: 14px;
  color: var(--text-secondary);
}

.challenge-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-primary);
}

/* Battle Pass */
.season-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.season-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
}

.premium-banner {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  margin-bottom: 32px;
  color: white;
}

.premium-banner h3 {
  font-size: 24px;
  margin-bottom: 8px;
}

.btn-premium {
  margin-top: 16px;
  padding: 12px 32px;
  border: none;
  background: white;
  color: #f59e0b;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-premium:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.tier-track {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
}

.tier-item {
  min-width: 120px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.2s;
}

.tier-item.current {
  border-color: var(--accent-primary);
  box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
}

.tier-item.completed {
  background: rgba(34, 197, 94, 0.1);
  border-color: #22c55e;
}

.tier-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.tier-rewards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.free-rewards,
.premium-rewards {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.premium-rewards {
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}

/* Shop */
.shop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.player-coins {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: #fbbf24;
}

.shop-categories {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.category-btn {
  padding: 8px 16px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover,
.category-btn.active {
  background: var(--accent-primary);
  color: white;
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.shop-item {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s;
}

.shop-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: var(--accent-primary);
}

.item-icon {
  width: 64px;
  height: 64px;
  background: var(--accent-gradient);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 28px;
  color: white;
}

.shop-item h4 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.shop-item p {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  min-height: 40px;
}

.item-price {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 18px;
  font-weight: 700;
  color: #fbbf24;
  margin-bottom: 12px;
}

.buy-btn {
  width: 100%;
  padding: 10px;
  border: none;
  background: var(--accent-primary);
  color: white;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.buy-btn:hover:not(:disabled) {
  background: var(--accent-secondary);
  transform: translateY(-2px);
}

.buy-btn:disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: not-allowed;
}

/* League */
.league-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.current-league {
  display: flex;
  align-items: center;
  gap: 16px;
}

.league-icon {
  font-size: 48px;
}

.league-icon.bronze { color: #cd7f32; }
.league-icon.silver { color: #c0c0c0; }
.league-icon.gold { color: #ffd700; }
.league-icon.platinum { color: #e5e4e2; }
.league-icon.diamond { color: #b9f2ff; }
.league-icon.master { color: #ff6b6b; }

.league-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.league-info p {
  font-size: 16px;
  color: var(--text-secondary);
}

.league-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: right;
}

.promotion-zone,
.demotion-zone {
  font-size: 14px;
}

.promotion-zone {
  color: #22c55e;
}

.demotion-zone {
  color: #ef4444;
}

.leaderboard {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
}

.leaderboard h3 {
  margin-bottom: 20px;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: all 0.2s;
}

.leaderboard-item:hover {
  transform: translateX(4px);
}

.leaderboard-item.current-player {
  background: var(--accent-primary);
  color: white;
}

.rank {
  font-size: 20px;
  font-weight: 700;
  min-width: 30px;
}

.player-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.player-name {
  font-weight: 500;
}

.player-points {
  font-weight: 600;
}

/* XP Notification */
.xp-notification {
  position: fixed;
  top: 100px;
  right: 20px;
  background: var(--bg-secondary);
  border: 2px solid var(--accent-primary);
  border-radius: 12px;
  padding: 16px 24px;
  opacity: 0;
  transform: translateX(100px);
  transition: all 0.3s ease;
  z-index: 1000;
}

.xp-notification.show {
  opacity: 1;
  transform: translateX(0);
}

.xp-notification.hide {
  opacity: 0;
  transform: translateY(-20px);
}

.xp-amount {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent-primary);
}

.xp-bonus {
  font-size: 16px;
  color: #fbbf24;
  margin-top: 4px;
}

.xp-source {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Level Up Overlay */
.level-up-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.level-up-overlay.show {
  opacity: 1;
}

.level-up-content {
  background: var(--bg-secondary);
  border-radius: 24px;
  padding: 48px;
  text-align: center;
  max-width: 500px;
  transform: scale(0.8);
  transition: transform 0.3s ease;
}

.level-up-overlay.show .level-up-content {
  transform: scale(1);
}

.level-up-header h1 {
  font-size: 36px;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: 24px;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.level-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 32px;
}

.old-level {
  color: var(--text-secondary);
}

.new-level {
  color: var(--accent-primary);
  animation: pulse 1s ease infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.level-up-rewards {
  margin-bottom: 32px;
}

.level-up-rewards h2 {
  font-size: 24px;
  color: var(--text-primary);
  margin-bottom: 20px;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reward-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: 12px;
  font-size: 18px;
  font-weight: 500;
  opacity: 0;
  transform: translateY(20px);
}

.reward-item.animate-in {
  animation: slideIn 0.5s ease forwards;
}

.reward-item:nth-child(1) { animation-delay: 0.1s; }
.reward-item:nth-child(2) { animation-delay: 0.2s; }
.reward-item:nth-child(3) { animation-delay: 0.3s; }

@keyframes slideIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  padding: 16px 48px;
  border: none;
  background: var(--accent-primary);
  color: white;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--accent-secondary);
  transform: scale(1.05);
}

/* Confetti */
.confetti {
  position: fixed;
  width: 10px;
  height: 10px;
  background: #7c3aed;
  animation: confetti-fall linear;
}

@keyframes confetti-fall {
  to {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

/* Quest Complete */
.quest-complete-notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  background: var(--bg-secondary);
  border: 3px solid #22c55e;
  border-radius: 24px;
  padding: 32px;
  text-align: center;
  z-index: 10001;
  transition: transform 0.3s ease;
}

.quest-complete-notification.show {
  transform: translate(-50%, -50%) scale(1);
}

.quest-complete-notification h2 {
  font-size: 28px;
  color: #22c55e;
  margin-bottom: 16px;
}

.quest-complete-notification .quest-name {
  font-size: 20px;
  color: var(--text-primary);
  margin-bottom: 24px;
}

/* Streak Bonus */
.streak-bonus-notification {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: white;
  border-radius: 16px;
  padding: 20px 32px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.4);
  transition: transform 0.3s ease;
  z-index: 1000;
}

.streak-bonus-notification.show {
  transform: translateX(-50%) translateY(0);
}

.streak-bonus-notification.hide {
  transform: translateX(-50%) translateY(100px);
}

.streak-bonus-notification i {
  font-size: 32px;
  margin-bottom: 8px;
}

.streak-bonus-notification h3 {
  font-size: 20px;
  margin-bottom: 4px;
}

/* No content states */
.no-quests,
.no-challenges {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
}

.no-quests i,
.no-challenges i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .gamification-hub {
    padding: 16px;
  }
  
  .player-progress-bar {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .hub-tabs {
    justify-content: center;
  }
  
  .shop-grid {
    grid-template-columns: 1fr;
  }
  
  .tier-track {
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  .league-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .level-up-content {
    padding: 32px 20px;
  }
  
  .level-display {
    font-size: 36px;
  }
}
</style>
`;

// Dodaj style do dokumentu
if (!document.getElementById('gamification-styles')) {
  const styleElement = document.createElement('div');
  styleElement.id = 'gamification-styles';
  styleElement.innerHTML = gamificationStyles;
  document.head.appendChild(styleElement.firstChild);
}