import Vue from "vue";
import Vuex from "vuex";
Vue.use(Vuex);

// Import name-spaced stores like so:
import settings from "./store-settings";

export default function(/* { ssrContext } */) {
  const Store = new Vuex.Store({
    modules: {
      settings,
    },
    strict: process.env.DEV,
  });

  return Store;
}
