const LocalStorage = window.localStorage;

const state = {
  settings: {
    audioOnly: false,
    url: "",
    outputDir: "",
    useRootDir: false,
  },
};

const mutations = {
  setAudioOnly(state, value) {
    console.log("Audio param set:", value);
    state.settings.audioOnly = value;
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

    console.log("Settings retrieved");
  },
  saveSettings({ state }) {
    LocalStorage.setItem("settings", JSON.stringify(state.settings));
    console.log("Settings saved");
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
