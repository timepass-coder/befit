import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';

import { Text, Card } from '@/components/ui';
import { lightTheme } from '@/theme';
import { useUserProfiles } from '@/database/database/useDatabase';
import { UserProfile } from '@/database/models/UserProfile';

interface ProfileListItemProps {
  item: UserProfile;
}

function ProfileListItem({ item }: ProfileListItemProps) {
  return (
    <Card style={styles.profileCard}>
      <View style={styles.profileHeader}>
        <Text variant="heading" style={styles.profileName}>
          {item.displayName}
        </Text>
        <Text variant="caption" style={styles.profileId}>
          ID: {item.id}
        </Text>
      </View>
      {item.email && (
        <Text variant="body" style={styles.profileEmail}>
          {item.email}
        </Text>
      )}
      <View style={styles.profileDates}>
        <Text variant="caption" style={styles.dateLabel}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text variant="caption" style={styles.dateLabel}>
          Updated: {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
    </Card>
  );
}

export default function ProfileScreen() {
  const { profiles, loading, error, refresh } = useUserProfiles();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={lightTheme.colors.primary} />
        <Text variant="body" style={styles.loadingText}>
          Loading profiles...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="heading" style={styles.errorTitle}>
          Error Loading Profiles
        </Text>
        <Text variant="body" style={styles.errorText}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text variant="heading" style={styles.emptyTitle}>
          No Profiles Yet
        </Text>
        <Text variant="body" style={styles.emptyText}>
          Seed the database to see sample profiles.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={profiles}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ProfileListItem item={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text variant="heading" style={styles.emptyTitle}>
              No Profiles
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: lightTheme.spacing.md,
    backgroundColor: lightTheme.colors.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: lightTheme.spacing.md,
    padding: lightTheme.spacing.lg,
  },
  listContent: {
    gap: lightTheme.spacing.md,
    paddingBottom: lightTheme.spacing.lg,
  },
  profileCard: {
    padding: lightTheme.spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: lightTheme.spacing.sm,
  },
  profileName: {
    flex: 1,
  },
  profileId: {
    color: lightTheme.colors.textSecondary,
  },
  profileEmail: {
    color: lightTheme.colors.textSecondary,
    marginBottom: lightTheme.spacing.sm,
  },
  profileDates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border,
    paddingTop: lightTheme.spacing.sm,
  },
  dateLabel: {
    color: lightTheme.colors.textSecondary,
  },
  loadingText: {
    color: lightTheme.colors.textSecondary,
  },
  errorTitle: {
    color: lightTheme.colors.error,
  },
  errorText: {
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    color: lightTheme.colors.text,
  },
  emptyText: {
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
  },
});
