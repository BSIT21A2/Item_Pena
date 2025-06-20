import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

let db = null;

export const setupDatabase = async () => {
  db = await SQLite.openDatabaseAsync('items.db');
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);`
  );

  const result = await db.getAllAsync('SELECT COUNT(*) AS count FROM items;');
  if (result[0].count === 0) {
    await db.runAsync('INSERT INTO items (name) VALUES (?);', ['test1']);
    await db.runAsync('INSERT INTO items (name) VALUES (?);', ['test2']);
    await db.runAsync('INSERT INTO items (name) VALUES (?);', ['test3']);
  }
};

export default function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setupDatabase().then(fetchItems);
  }, []);

  const fetchItems = async () => {
    if (!db) return;
    const results = await db.getAllAsync('SELECT id, name FROM items;');
    setItems(results.map((row) => ({ id: row.id, name: row.name })));
  };

  const addItem = async () => {
    if (!db || text.trim() === '') return;

    const existing = await db.getAllAsync(
      'SELECT * FROM items WHERE LOWER(name) = LOWER(?);',
      [text.trim()]
    );
    if (existing.length > 0) {
      Alert.alert('Duplicate item', 'This item already exists.');
      return;
    }

    Alert.alert(
      'Confirm Add',
      `Are you sure you want to add "${text.trim()}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await db.runAsync('INSERT INTO items (name) VALUES (?);', [
              text.trim(),
            ]);
            setText('');
            setSearchQuery('');
            fetchItems();
          },
        },
      ]
    );
  };

  const editItem = (item) => {
    setText(item.name);
    setEditingItem(item);
  };

  const updateItem = async () => {
    if (!db || !editingItem || text.trim() === '') return;

    const existing = await db.getAllAsync(
      'SELECT * FROM items WHERE LOWER(name) = LOWER(?) AND id != ?;',
      [text.trim(), editingItem.id]
    );
    if (existing.length > 0) {
      Alert.alert('Duplicate item', 'Another item with this name already exists.');
      return;
    }

    Alert.alert(
      'Confirm Update',
      `Are you sure you want to update the item to "${text.trim()}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            await db.runAsync('UPDATE items SET name = ? WHERE id = ?;', [
              text.trim(),
              editingItem.id,
            ]);
            setText('');
            setEditingItem(null);
            fetchItems();
          },
        },
      ]
    );
  };

  const deleteItem = async (id) => {
    if (!db) return;

    Alert.alert('Confirm Delete', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          await db.runAsync('DELETE FROM items WHERE id = ?;', [id]);
          fetchItems();
        },
      },
    ]);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTextChange = (inputText) => {
    setText(inputText);  // no auto capitalization or formatting
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.header}>My Item Manager</Text>

      {/* Search Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.textInput}
          placeholderTextColor="#bbb"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Item Input */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Enter item"
          placeholderTextColor="#bbb"
          value={text}
          onChangeText={handleTextChange}
          style={styles.textInput}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={() => (editingItem ? updateItem() : addItem())}
        />
        {text.length > 0 && (
          <TouchableOpacity
            onPress={() => setText('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Add/Update Button */}
      <TouchableOpacity
        style={[styles.button, editingItem ? styles.updateButton : styles.addButton]}
        activeOpacity={0.8}
        onPress={editingItem ? updateItem : addItem}
      >
        <Text style={styles.buttonText}>{editingItem ? 'Update Item' : 'Add Item'}</Text>
      </TouchableOpacity>

      {/* Item List or No Items */}
      {filteredItems.length === 0 ? (
        <View style={styles.noItemsContainer}>
          <Text style={styles.noItemsText}>No items found</Text>
          {searchQuery.trim() !== '' && (
            <TouchableOpacity
              style={styles.addFromSearchButton}
              onPress={() => {
                setText(searchQuery);
                addItem();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addFromSearchText}>Add "{searchQuery.trim()}"</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={styles.itemText}>{item.name}</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity onPress={() => editItem(item)} style={styles.actionButton}>
                  <Text style={[styles.actionText, styles.editText]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deleteItem(item.id)}
                  style={styles.actionButton}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const colors = {
  primary: '#4a90e2',
  secondary: '#50e3c2',
  background: '#f0f4f8',
  white: '#fff',
  textPrimary: '#333',
  textSecondary: '#666',
  danger: '#e94e4e',
  grayLight: '#ddd',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.grayLight,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
    color: colors.primary,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
  },
  clearButton: {
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 22,
    color: colors.grayLight,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  updateButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  list: {
    flex: 1,
  },
  listItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  itemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editText: {
    color: colors.primary,
  },
  deleteText: {
    color: colors.danger,
  },
  noItemsContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  noItemsText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  addFromSearchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addFromSearchText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
});
