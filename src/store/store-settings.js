const LocalStorage = window.localStorage;

const state = {
  settings: {
    audioOnly: false,
    videoOnly: false,
    url: "",
    outputDir: "",
    useRootDir: false,
    bestQuality: false,
  },
};

const mutations = {
  setAudioOnly(state, value) {
    if (value) {
      state.settings.bestQuality = false;
      state.settings.videoOnly = false;
    }
    state.settings.audioOnly = value;
  },
  setVideoOnly(state, value) {
    if (value) {
      state.settings.bestQuality = false;
      state.settings.audioOnly = false;
    }
    state.settings.videoOnly = value;
  },
  setBestQuality(state, value) {
    if (value) {
      state.settings.audioOnly = false;
      state.settings.videoOnly = false;
    }
    state.settings.bestQuality = value;
  },
  setUseRootDir(state, value) {
    state.settings.useRootDir = value;
  },
  setUrl(state, value) {
    state.settings.url = value;
  },
  setOutputDir(state, value) {
    state.settings.outputDir = value;
  },
  setSettings(state, value) {
    Object.assign(state.settings, value);
  },
};

const actions = {
  setAudioOnly({ commit, dispatch }, value) {
    commit("setAudioOnly", value);
    dispatch("saveSettings");
  },
  setVideoOnly({ commit, dispatch }, value) {
    commit("setVideoOnly", value);
    dispatch("saveSettings");
  },
  setBestQuality({ commit, dispatch }, value) {
    commit("setBestQuality", value);
    dispatch("saveSettings");
  },
  setUseRootDir({ commit, dispatch }, value) {
    commit("setUseRootDir", value);
    dispatch("saveSettings");
  },
  setUrl({ commit, dispatch }, value) {
    commit("setUrl", value);
    dispatch("saveSettings");
  },
  setOutputDir({ commit, dispatch }, value) {
    commit("setOutputDir", value);
    dispatch("saveInputs");
  },
  getSettings({ commit }) {
    let settings = LocalStorage.getItem("settings");
    if (settings)
      commit("setSettings", isJSON(settings) ? JSON.parse(settings) : settings);
  },
  saveSettings({ state }) {
    LocalStorage.setItem("settings", JSON.stringify(state.settings));
  },
  // Should always give yourself the ability to remove from Vuex,
  // otherwise you can find yourself in a spot where you can't get rid of data:
  deleteAll({ dispatch, state }) {
    Object.keys(state).forEach((key) => {
      LocalStorage.removeItem(key);
    });
    console.log("RESET");
    dispatch("resetAll");
  },
  // Since Vuex doesn't have an easy way to return to base state,
  // I manually keep a backup of the original and commit them when needed:
  resetAll({ commit }) {
    let defaults = {
      settings: {
        audioOnly: false,
        url: "",
        outputDir: "",
      },
    };
    Object.keys(defaults).forEach((key) => {
      commit(`set${key.charAt(0).toUpperCase() + key.slice(1)}`, defaults[key]);
    });
  },
};

const getters = {
  settings: (state) => {
    return state.settings;
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};

function isJSON(string) {
  try {
    JSON.parse(string);
    return true;
  } catch (err) {
    return false;
  }
}
