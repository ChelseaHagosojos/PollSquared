import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { Picker } from '@react-native-picker/picker';
import { auth, db } from '../../firebase/firebaseConfig';
import colors from '../../constant/colors';

export default function Create() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDescription, setPollDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState({
    value: '',
    unit: 'hours', // Default unit
  });
  const totalSteps = 4;

  // Navigation
  const nextStep = () => {
    if (step === 1 && !pollTitle.trim()) {
      Alert.alert('Error', 'Poll title cannot be empty');
      return;
    }
    if (step === 2) {
      const trimmedOptions = options.map((opt) => opt.trim());
      if (trimmedOptions.some((opt) => opt === '')) {
        Alert.alert('Error', 'Poll options cannot be empty');
        return;
      }
      const uniqueOptions = new Set(trimmedOptions);
      if (uniqueOptions.size !== trimmedOptions.length) {
        Alert.alert('Error', 'Options must be unique.');
        return;
      }
    }
    if (step === 3 && (!duration.value || isNaN(duration.value))) {
      Alert.alert('Error', 'Please enter a valid poll duration');
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  // Options management
  const addOption = () => {
    if (options.length < 5) {
      const trimmedOptions = options.map(opt => opt.trim());
      if (trimmedOptions.includes('')) {
        Alert.alert('Error', 'Fill in existing options before adding a new one.');
        return;
      }
      setOptions([...options, '']);
    } else {
      Alert.alert('Limit Reached', 'You can add up to 5 options only.');
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
    else Alert.alert('Minimum Required', 'At least 2 options are required.');
  };

  const updateOption = (text, index) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  // Submit Poll to Firestore
  const submitPoll = async () => {
    if (isLoading) return; // Prevent multiple submissions
  
    try {
      setIsLoading(true); // Start loading
  
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a poll.');
        setIsLoading(false);
        return;
      }
  
      // Validate duration
      if (!duration.value || isNaN(duration.value)) {
        Alert.alert('Error', 'Please enter a valid duration.');
        setIsLoading(false);
        return;
      }
  
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const username = userDoc.exists() ? userDoc.data().username : 'Unknown User';
      const formattedOptions = options.map(option => ({ text: option, votes: 0 }));
      const pollData = {
        title: pollTitle,
        description: pollDescription,
        options: formattedOptions,
        duration: { value: duration.value, unit: duration.unit },
        createdAt: serverTimestamp(),
        totalVotes: 0,
        status: 'active',
        createdBy: user.uid,
        creatorName: username,
      };
  
      const docRef = await addDoc(collection(db, 'polls'), pollData);
      console.log('Poll created with ID:', docRef.id);
  
      Alert.alert('Success', 'Your poll has been created successfully!');
      router.push('/'); // Redirect after creation
    } catch (error) {
      console.error('Error creating poll:', error);
      Alert.alert('Error', 'Failed to create poll. Please try again.');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };
  

  // Render Step Content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.inputContainer}>
            <Text style={{ marginTop: 20, marginBottom: 10 }}>Poll Title:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your poll title"
              value={pollTitle}
              onChangeText={setPollTitle}
            />
            <Text style={{ marginTop: 20, marginBottom: 10 }}>Poll Description (Optional):</Text>
            <TextInput
              style={{
                textAlignVertical: 'top',
                minHeight: 100,
                borderWidth: 1,
                borderColor: 'gray',
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                backgroundColor: 'white',
                marginBottom: 10,
              }}
              placeholder="Enter a short description (optional)"
              value={pollDescription}
              onChangeText={setPollDescription}
              multiline
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Poll Options:</Text>
            {options.map((option, index) => (
              <View key={index} style={styles.optionContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.inputoption}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChangeText={(text) => updateOption(text, index)}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity onPress={() => removeOption(index)} style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={24} color="red" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
            {options.length < 5 && (
              <TouchableOpacity onPress={addOption} style={styles.addOptionButton}>
                <Text style={{ color: colors.BLUE }}>+ Add Option</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Poll Duration:</Text>
            <View style={styles.durationPickerContainer}>
              <TextInput
                style={styles.durationInput}
                placeholder="Enter duration"
                keyboardType="numeric"
                value={duration.value}
                onChangeText={(text) => setDuration((prev) => ({ ...prev, value: text }))}
              />
              <Picker
                style={styles.durationPicker}
                selectedValue={duration.unit}
                onValueChange={(itemValue) => setDuration((prev) => ({ ...prev, unit: itemValue }))}
              >
                <Picker.Item label="Minutes" value="minutes" />
                <Picker.Item label="Hours" value="hours" />
                <Picker.Item label="Days" value="days" />
              </Picker>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.inputContainer}>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginVertical: 20 }}>Review</Text>
            <View style={styles.pollContainer}>
              {/* Poll Header */}
              <View style={styles.pollHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={require('./../../assets/images/default.png')} // Use default profile picture
                    style={styles.profilePic}
                  />
                  <Text style={styles.creatorName}>You</Text>
                </View>
                <View style={styles.voteCountContainer}>
                  <Text style={styles.voteCountText}>0 Votes</Text>
                </View>
              </View>

              {/* Poll Title and Description */}
              <Text style={styles.pollTitle}>{pollTitle}</Text>
              {pollDescription ? <Text style={styles.pollDescription}>{pollDescription}</Text> : null}

              {/* Poll Duration */}
              <Text style={styles.pollDuration}>
                Ends in: {duration.value} {duration.unit}
              </Text>

              {/* Poll Options */}
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  disabled // Disable interaction in review mode
                >
                  <View style={styles.optionCircle} />
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity 
          onPress={() => {
            if (!(step === 4 && isLoading)) {
              router.back();
            }
          }} 
          style={{ padding: 10, opacity: step === 4 && isLoading ? 0.5 : 1 }} // Fade effect when disabled
          disabled={step === 4 && isLoading} // Disable only in Step 4 while submitting
        >
          <Ionicons name="arrow-back" size={28} color="black" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Create Poll</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>{renderStepContent()}</ScrollView>
      <View style={styles.stepperContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[styles.step, step >= s && styles.activeStep]} />
        ))}
      </View>
      <View style={styles.buttonContainer}>
      {step > 1 && (
          <TouchableOpacity 
            onPress={prevStep} 
            style={{
              padding: 15, 
              backgroundColor: step === 4 && isLoading ? 'gray' : 'gray', 
              width: '48%', 
              borderRadius: 20, 
              alignItems: 'center',
              opacity: step === 4 && isLoading ? 0.5 : 1, // Reduce opacity when disabled
            }}
            disabled={step === 4 && isLoading} // Disable only in Step 4 while submitting
          >
            <Text style={styles.buttonText}>Previous</Text>
          </TouchableOpacity>
        )}

        {step < totalSteps ? (
          <TouchableOpacity onPress={nextStep} style={styles.button}>
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={submitPoll} style={styles.button} disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? 'Submitting...' : 'Submit'}</Text>
          </TouchableOpacity>

        )}
      </View>
    </View>
  );
}

// Styles
const styles = {
  container: { flex: 1, backgroundColor: colors.LIGHT, padding: 20, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerText: { fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  step: { width: 10, height: 10, borderRadius: 10, backgroundColor: 'gray', marginHorizontal: 5 },
  activeStep: { backgroundColor: colors.BLUE },
  inputContainer: { width: '100%', paddingHorizontal: 20 },
  input: { borderWidth: 1, borderColor: 'gray', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: 'white', marginBottom: 20 },
  durationPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  durationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginRight: 10,
  },
  durationPicker: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  button: { padding: 15, backgroundColor: colors.BLUE, width: '48%', borderRadius: 20, alignItems: 'center' },
  buttonText: { color: colors.LIGHT },
  label: { marginTop: 20, marginBottom: 20 },
  optionContainer: {
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  inputoption: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  deleteButton: {
    marginLeft: 10,
  },
  pollContainer: {
    backgroundColor: 'white',
    padding: 20,
    paddingBottom: 30,
    marginBottom: 25,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 4,
    borderColor: 'white',
    elevation: 3,
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  profilePic: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 10,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.GRAY,
  },
  voteCountContainer: {
    backgroundColor: colors.BLUE,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  voteCountText: {
    color: 'white',
    fontSize: 14,
  },
  pollTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  pollDescription: {
    fontSize: 14,
    marginBottom: 10,
  },
  pollDuration: {
    fontSize: 14,
    color: colors.BLUE,
    marginVertical: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    marginTop: 5,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 4,
    borderColor: 'white',
    elevation: 3,
  },
  optionCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.DARK,
    marginRight: 10,
  },
  optionText: {
    color: colors.DARK,
  },
};