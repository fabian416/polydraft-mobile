import type { NavigatorScreenParams } from '@react-navigation/native';

export type PackStackParamList = {
  PackOpen: { premium?: boolean } | undefined;
  PackReveal: { packId: string };
  PackDetail: { packId: string };
};

export type MainTabParamList = {
  Game: undefined;
  Explore: undefined;
  MyPacks: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  EventDetail: { eventId: string };
  PackFlow: NavigatorScreenParams<PackStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
