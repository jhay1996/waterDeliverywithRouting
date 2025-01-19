import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Button, TextInput, Alert, StyleSheet, Image, FlatList, Linking, Modal } from 'react-native';
import { Ionicons } from 'react-native-vector-icons'; // Import Ionicons
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location'; // Import Location from expo-location
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
const ORDER_API_URL = 'https://samplesytems.shop/backend/neworders.php'; 
const Tab = createBottomTabNavigator();

// Home Screen to show user info and orders count
const HomeScreen = ({ user }) => {
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Function to fetch orders and count 'to be delivered' ones
  const fetchOrders = async () => {
    try {
      const response = await axios.get('https://samplesytems.shop/backend/getorders.php');
      const orders = response.data.orders;
      const toBeDeliveredCount = orders.filter(order => order.Status === 'To be Delivered').length;
      setOrdersCount(toBeDeliveredCount);
    } catch (error) {
      console.log('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to fetch orders');
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Cards at the top */}
      <View style={styles.card}>
        <Text style={styles.welcomeText}>Welcome, {user ? user.name : 'Guest'}!</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>To be Delivered Orders</Text>
        <Text style={styles.cardCount}>{ordersCount}</Text>
      </View>

      {/* Icon and picture below the cards */}
      <View style={styles.bottomSection}>
        <Image
          source={{ uri: 'https://samplesytems.shop/backend/ava.png' }} // Replace with the correct URL to your 'ava' image
          style={styles.image}
        />
      </View>
    </View>
  );
};

// Orders Screen to display orders list
const OrdersScreen = () => { 
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]); 
  const [isModalVisible, setModalVisible] = useState(false);
  const [isPaymentModalVisible, setPaymentModalVisible] = useState(false); 
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); 
  const [currentCoordinates, setCurrentCoordinates] = useState(null);
  const [selectedOrderCoordinates, setSelectedOrderCoordinates] = useState(null);
  const [viewRoute, setViewRoute] = useState(false);
  const [filter, setFilter] = useState('all'); 
  const [selectedImage, setSelectedImage] = useState(null); 

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('https://samplesytems.shop/backend/getorders.php');
        if (response.data.success) {
          setOrders(response.data.orders);
          setFilteredOrders(response.data.orders); 
        } else {
          Alert.alert('Error', response.data.error || 'Unable to fetch orders');
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        Alert.alert('Error', 'An error occurred while fetching orders');
      }
    };

    fetchOrders();

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'You need to grant location access to use this feature.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentCoordinates({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
        Alert.alert('Error', 'Unable to fetch current location');
      }
    })();
  }, []);

  const handleViewDetails = (order) => {
    setSelectedOrderDetails(order); 
    setModalVisible(true); 
  };

  const handlePayment = () => {
    setPaymentModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedOrderDetails(null); 
    setSelectedOrderCoordinates(null);
    setViewRoute(false); 
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false); 
  };

  const fetchCoordinates = async (address) => {
    try {
      const encodedAddress = encodeURIComponent(address);
      const googleGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyC70wVtKNui5s8L3xKPevA_NE8pYuh9XDk`;

      const response = await axios.get(googleGeocodeUrl);
      const location = response.data.results[0]?.geometry.location;

      if (location) {
        setSelectedOrderCoordinates({
          latitude: location.lat,
          longitude: location.lng,
        });
      } else {
        Alert.alert('Error', 'Unable to fetch coordinates for this address');
      }
    } catch (error) {
      console.error('Error fetching coordinates:', error);
      Alert.alert('Error', 'Failed to fetch coordinates');
    }
  };

  const handleViewRoute = () => {
    if (selectedOrderCoordinates) {
      setViewRoute(true); 
    } else {
      fetchCoordinates(selectedOrderDetails.Address); 
    }
  };

  const filterOrders = (status) => {
    if (status === 'all') {
      setFilteredOrders(orders); 
    } else {
      const filtered = orders.filter(order => order.Status === status);
      setFilteredOrders(filtered); 
    }
    setFilter(status); 
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardText}>Name: {item.Name || 'N/A'}</Text>
      <Text style={styles.cardText}>Address: {item.Address || 'N/A'}</Text>
      <Text style={styles.cardText}>Status: {item.Status}</Text>
      <Button title="View Details" onPress={() => handleViewDetails(item)} />
    </View>
  );

  const renderRoute = () => {
    if (currentCoordinates && selectedOrderCoordinates && viewRoute) {
      const routeCoordinates = [
        { latitude: currentCoordinates.latitude, longitude: currentCoordinates.longitude },
        { latitude: selectedOrderCoordinates.latitude, longitude: selectedOrderCoordinates.longitude },
      ];

      return <Polyline coordinates={routeCoordinates} strokeColor="#FF6347" strokeWidth={4} />;
    }
    return null;
  };

  const renderModalContent = () => {
    if (!selectedOrderDetails) {
      return <Text>Loading...</Text>;
    }
  
    const { Name, Address, Mobile, Email, Status, items, totalAmount } = selectedOrderDetails;
  
    return (
      <View>
        <Text style={styles.modalTitle}>Order Details</Text>
  
        {/* Order Information */}
        <Text style={styles.orderInfoText}>Name: {Name || 'N/A'}</Text>
        <Text style={styles.orderInfoText}>Address: {Address || 'N/A'}</Text>
        <Text style={styles.orderInfoText}>Mobile: {Mobile || 'N/A'}</Text>
        <Text style={styles.orderInfoText}>Email: {Email || 'N/A'}</Text>
        <Text style={styles.orderInfoText}>Status: {Status || 'N/A'}</Text>
  
        <Text style={styles.modalSubTitle}>Order Items:</Text>
        {/* Check if there are any items */}
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <View key={index} style={styles.itemContainer}>
              <Text>{item.name} - {item.quantity} x ₱{item.price}</Text>
              <Text>Amount: ₱{item.amount}</Text>
            </View>
          ))
        ) : (
          <Text>No items available.</Text>
        )}
  
        {/* Total Amount */}
        <Text style={styles.modalSubTitle}>Total: ₱{totalAmount || '0.00'}</Text>
  
        {/* Action Buttons */}
        <Button 
  title="View Route" 
  onPress={handleViewRoute} 
  color="green" 
  style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 }} 
/>
<Button 
  title="Payment" 
  onPress={handlePayment} 
  color="blue" 
  style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 }} 
/>

      </View>
    );
  };
  
  
 // Declare the state to hold the selected image URI
 const renderPaymentModalContent = () => {
  const handleImagePick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);  // Update the state with the selected image URI
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Error selecting image. Please try again.');
    }
  };

  const resizeImage = async (uri) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],  // Resize the image to a smaller width (e.g., 800px)
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }  // Compress and convert to JPEG
      );
      return result.uri;  // Return the resized image URI
    } catch (error) {
      console.error('Error resizing image:', error);
      return uri;  // Return original URI in case of error
    }
  };
  const handleConfirmPayment = async () => {
    const paymentData = {
      ordernum: selectedOrderDetails.ordernum,
      name: selectedOrderDetails.Name,
      address: selectedOrderDetails.Address,
      mobile: selectedOrderDetails.Mobile,
      items: selectedOrderDetails.items,
      totalAmount: selectedOrderDetails.totalAmount,
    };
  
    // Check if all required fields are set
    console.log('Payment Data:', paymentData);
  
    const formData = new FormData();
    formData.append('ordernum', paymentData.ordernum);
    formData.append('name', paymentData.name);
    formData.append('address', paymentData.address);
    formData.append('mobile', paymentData.mobile);
    formData.append('order_items', JSON.stringify(paymentData.items)); // Ensure this key matches with PHP
    formData.append('totalAmount', paymentData.totalAmount);
  
    // Check if image is selected
    if (selectedImage) {
      const uriParts = selectedImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const mimeType = `image/${fileType}`;
  
      formData.append('image', {
        uri: selectedImage,
        name: `image.${fileType}`,
        type: mimeType, // Ensure correct mime type
      });
    }
  
    // Log formData to debug
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
  
    try {
      // Simultaneously upload image and send payment data
      const paymentResponse = await fetch('https://samplesytems.shop/backend/savepayment.php', {
        method: 'POST',
        body: formData,
      });
  
      const rawResponse = await paymentResponse.text();
      console.log('Raw server response:', rawResponse); // Log raw response
  
      if (!paymentResponse.ok) {
        throw new Error(`HTTP error! Status: ${paymentResponse.status}`);
      }
  
      // Check if the response is a success or failure
      if (rawResponse.includes("success:true")) {
        Alert.alert('Success', 'Payment successfully saved and order marked as delivered!');
        closePaymentModal();  // Close the modal after success
      } else {
        const errorMessage = rawResponse.split(',')[1].split(':')[1].trim().replace(/"/g, '');
        Alert.alert('Error', errorMessage || 'Failed to process payment and update order status. Please try again.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Error processing payment. Please try again.');
    }
  };
  
  
  
  
  if (selectedOrderDetails) {
    return (
      <View>
        <Text style={styles.modalTitle}>Payment Details</Text>

        {/* Displaying the order number */}
        <Text style={styles.modalSubTitle}>Order Number: {selectedOrderDetails.ordernum}</Text>

        <TextInput
          style={styles.modalinput}
          value={selectedOrderDetails.Name}
          editable={false}
          placeholder="Name"
        />
        <TextInput
          style={styles.modalinput}
          value={selectedOrderDetails.Address}
          editable={false}
          placeholder="Address"
        />
        <TextInput
          style={styles.modalinput}
          value={selectedOrderDetails.Mobile}
          editable={false}
          placeholder="Mobile"
        />

        <Text style={styles.modalmodalSubTitle}>Order Items:</Text>

        {selectedOrderDetails.items.map((item, index) => (
          <View key={index} style={styles.itemContainer}>
            <Text>{item.name} - {item.quantity} x ₱{item.price}</Text>
            <Text>Amount: ₱{item.amount}</Text>
          </View>
        ))}

        <Text style={styles.modalSubTitle}>Total: ₱{selectedOrderDetails.totalAmount}</Text>

        {/* Upload Image Section */}
        <Button title="Select Image" onPress={handleImagePick} color="green" />
        {selectedImage && (
          <Image source={{ uri: selectedImage }} style={{ width: 100, height: 100, marginTop: 10 }} />
        )}

        <Button title="Confirm Payment" onPress={handleConfirmPayment} color="blue" />
        <Button title="Close" onPress={closePaymentModal} color="red" />
      </View>
    );
  }

  return <Text>Loading...</Text>;
};

  
  
  


  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <Button title="All" onPress={() => filterOrders('all')} />
        <Button title="Delivered" onPress={() => filterOrders('Delivered')} />
        <Button title="To be Delivered" onPress={() => filterOrders('To be Delivered')} />
      </View>

      {/* List of orders */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.ordernum.toString()}
      />

      {/* Modal for displaying the route or order details */}
      <Modal animationType="slide" transparent={true} visible={isModalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {renderModalContent()}

            {viewRoute && selectedOrderCoordinates && currentCoordinates && (
              <MapView
                style={styles.map}
                region={{
                  latitude: selectedOrderCoordinates.latitude,
                  longitude: selectedOrderCoordinates.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={selectedOrderCoordinates} title="Order Address" description={selectedOrderDetails.Address} />
                <Marker coordinate={currentCoordinates} title="Your Location" description="You are here" />
                {renderRoute()}
              </MapView>
            )}

            <Button title="Close" onPress={closeModal} color="#FF6347" />
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal animationType="slide" transparent={true} visible={isPaymentModalVisible} onRequestClose={closePaymentModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {renderPaymentModalContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
};






// Logout Screen to handle logout
const LogoutScreen = ({ logout }) => {
  return (
    <View style={styles.screenContainer}>
      <Button title="Logout" onPress={logout} color="#FF6347" />
    </View>
  );
};

// Login Screen to authenticate users
const LoginScreen = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      const response = await axios.post('https://samplesytems.shop/backend/login.php', {
        username,
        password,
      });

      if (response.data.success) {
        setUser(response.data.user); // User object from the API response
      } else {
        Alert.alert('Error', response.data.error || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={login} color="#4CAF50" />
    </View>
  );
};

// Main App Component with Navigation
export default function App() {
  const [user, setUser] = useState(null);

  const logout = () => {
    setUser(null); // Clears the user state on logout
  };

  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: 'gray',
            tabBarStyle: { backgroundColor: '#fff' },
          }}
        >
          <Tab.Screen
            name="Home"
            children={() => <HomeScreen user={user} />}
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
            }}
          />
          <Tab.Screen
            name="Orders"
            component={OrdersScreen}
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="list-outline" size={24} color={color} />,
            }}
          />
          <Tab.Screen
            name="Logout"
            children={() => <LogoutScreen logout={logout} />}
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="log-out-outline" size={24} color={color} />,
            }}
          />
        </Tab.Navigator>
      ) : (
        <LoginScreen setUser={setUser} />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loginTitle: {
    fontSize: 80,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4CAF50',
  },
  input: {
    width: '100%',
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    fontSize: 13,
  },
  card: {
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'linear-gradient(135deg, #f9f9f9, #e0e0e0)', // Gradient background
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cardCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  bottomSection: {
    marginTop: 30,
    alignItems: 'center',
  },
  image: {
    width: 400,
    height: 400,
    borderRadius: 50,
    marginTop: 10,
  },
  cardText: {
    fontSize: 12,
    marginBottom: 8,
    color: '#555', // Lighter text color
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Darker overlay for better contrast
  },
  modalContainer: {
    width: '90%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalText: {
    fontSize: 12,
    marginBottom: 5,
    color: '#333',
  },
  modalButtonContainer: {
    width: '91%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  map: {
    width: '100%',
    height: 300,
    marginBottom: 20,
  },
  orderCardText: {
    fontSize: 5,
    marginBottom: 8,
  },
  actionButtonsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalContentWrapper: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
  },
  modalButtonWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },

  modalmodalSubTitle: {
    fontSize: 18,
    color: '#555',
    marginTop: 20,
    marginBottom: 10,
    paddingLeft: 10,
  },
  modalinput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginVertical: 10,
    marginHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  orderInfoText: {
    fontSize: 16,
    color: '#555',
    marginVertical: 5,
    paddingLeft: 15,
  },
});
