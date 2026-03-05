import type { NavigatorScreenParams } from '@react-navigation/native';

export type PackStackParamList = {
  PackOpen: undefined;
  PackReveal: { packId: string };
  PackDetail: { packId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Game: undefined;
  Explore: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  EventDetail: { eventId: string };
  MyPacks: undefined;
  PackFlow: NavigatorScreenParams<PackStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
