import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import ResponsiveContent from '../../../shared/components/ResponsiveContent';
import categories from '../data/categories';

const ThreeDCategories = () => {
  const [searchText, setSearchText] = React.useState('');
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <ResponsiveContent>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>3D Object Categories</Text>
        <FontAwesomeIcon icon={faSearch} size="20" color="#64748b" />
      </View>

      <View style={styles.searchBarContainer}>
        <TextInput
          placeholder="Search categories..."
          value={searchText}
          onChangeText={setSearchText}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.categoryGrid}>
        {filteredCategories.map((item) => (
          <View key={item.id} style={styles.categoryItem}>
            <Text style={styles.categoryText}>{item.name}</Text>
            <Text style={styles.categoryCount}>{item.count} models</Text>
          </View>
        ))}
        {filteredCategories.length === 0 && <Text style={styles.emptyText}>No categories match your search.</Text>}
      </View>
      </ResponsiveContent>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0e17' },
  container: { flexGrow: 1, backgroundColor: '#0a0e17', paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    backgroundColor: '#1e2431',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontFamily: 'Inter Bold',
    fontSize: 18,
    color: '#f8fafc',
    flex: 1,
    flexShrink: 1,
    textAlign: 'center',
  },
  searchBarContainer: {
    padding: 20,
    backgroundColor: '#0f1622',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  searchInput: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#f8fafc',
    backgroundColor: '#1e2431',
    borderRadius: 12,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  categoryItem: { flexGrow: 1, flexBasis: '30%', minWidth: 180, padding: 18, backgroundColor: 'rgba(255,255,255,0.065)', borderWidth: 1, borderColor: 'rgba(230,244,255,0.15)', borderRadius: 18 },
  categoryText: {
    color: '#f8fafc',
    fontFamily: 'Inter Medium',
    fontSize: 14,
  },
  categoryCount: {
    color: '#64748b',
    fontSize: 12,
    marginLeft: 4,
  },
  emptyText: { color: '#8292aa', padding: 18, textAlign: 'center' },
});

export default ThreeDCategories;
