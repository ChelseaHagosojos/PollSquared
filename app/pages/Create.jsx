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
  const [pollType, setPollType] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [booleanType, setBooleanType] = useState('yesno'); // 'yesno' or 'truefalse'
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState({ value: '', unit: 'hours' });
  const totalSteps = 4;

  const nextStep = () => {
    if (step === 1) {
      if (!pollTitle.trim()) return Alert.alert('Error', 'Poll title cannot be empty');
      if (!pollType) return Alert.alert('Error', 'Please select a poll type.');
    }
    if (step === 2) {
      if (pollType === 'multiple') {
        const trimmedOptions = options.map((opt) => opt.trim());
        if (trimmedOptions.some((opt) => opt === ''))
          return Alert.alert('Error', 'Poll options cannot be empty');
        const uniqueOptions = new Set(trimmedOptions);
        if (uniqueOptions.size !== trimmedOptions.length)
          return Alert.alert('Error', 'Options must be unique.');
      } else if (pollType === 'rating') {
        const ratingMax = parseInt(options[0]);
        if (!ratingMax || isNaN(ratingMax)) return Alert.alert('Error', 'Invalid rating value.');
      }
    }
    if (step === 3 && (!duration.value || isNaN(duration.value)))
      return Alert.alert('Error', 'Please enter a valid poll duration');
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

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

  const submitPoll = async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a poll.');
        setIsLoading(false);
        return;
      }

      let formattedOptions;
      if (pollType === 'boolean') {
        if (booleanType === 'yesno') {
          formattedOptions = [{ text: 'Yes', votes: 0 }, { text: 'No', votes: 0 }];
        } else {
          formattedOptions = [{ text: 'True', votes: 0 }, { text: 'False', votes: 0 }];
        }
      } else if (pollType === 'rating') {
        const max = parseInt(options[0]);
        if (!max || isNaN(max)) {
          Alert.alert('Error', 'Invalid rating max value.');
          setIsLoading(false);
          return;
        }
        formattedOptions = Array.from({ length: max }, (_, i) => ({ text: `${i + 1}`, votes: 0 }));
      } else if (pollType === 'likert') {
        formattedOptions = [
          { text: 'Strongly Disagree', votes: 0 },
          { text: 'Disagree', votes: 0 },
          { text: 'Neutral', votes: 0 },
          { text: 'Agree', votes: 0 },
          { text: 'Strongly Agree', votes: 0 },
        ];
      } else {
        formattedOptions = options.map(option => ({ text: option, votes: 0 }));
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const username = userDoc.exists() ? userDoc.data().username : 'Unknown User';

      const pollData = {
        title: pollTitle,
        description: pollDescription,
        type: pollType,
        booleanType: pollType === 'boolean' ? booleanType : null,
        options: formattedOptions,
        duration: { value: duration.value, unit: duration.unit },
        createdAt: serverTimestamp(),
        totalVotes: 0,
        status: 'active',
        createdBy: user.uid,
        creatorName: username,
      };

      await addDoc(collection(db, 'polls'), pollData);
      Alert.alert('Success', 'Your poll has been created successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error creating poll:', error);
      Alert.alert('Error', 'Failed to create poll. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Poll Title:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your poll title"
              value={pollTitle}
              onChangeText={setPollTitle}
            />
            <Text style={styles.label}>Poll Description (Optional):</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Enter a short description (optional)"
              value={pollDescription}
              onChangeText={setPollDescription}
              multiline
            />
            <Text style={styles.label}>Poll Type:</Text>
  <View style={styles.pickerWrapper}>
    <Picker
      selectedValue={pollType}
      onValueChange={(itemValue) => {
        setPollType(itemValue);
        if (itemValue === 'rating') setOptions(['']);
        else if (itemValue === 'multiple') setOptions(['', '']);
      }}
      style={styles.picker}
    >
      <Picker.Item label="Select Poll Type" value="" />
      <Picker.Item label="Multiple Choice" value="multiple" />
      <Picker.Item label="Yes/No or True/False" value="boolean" />
      <Picker.Item label="Rating Scale" value="rating" />
      <Picker.Item label="Likert Scale" value="likert" />
    </Picker>
  </View>
          </View>
        );

      case 2:
        if (pollType === 'boolean') {
          return (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Boolean Type:</Text>
              <View style={styles.booleanTypeContainer}>
                <TouchableOpacity 
                  style={[styles.booleanTypeButton, booleanType === 'yesno' && styles.selectedBooleanType]}
                  onPress={() => setBooleanType('yesno')}
                >
                  <Text style={booleanType === 'yesno' ? styles.selectedBooleanText : styles.booleanText}>Yes/No</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.booleanTypeButton, booleanType === 'truefalse' && styles.selectedBooleanType]}
                  onPress={() => setBooleanType('truefalse')}
                >
                  <Text style={booleanType === 'truefalse' ? styles.selectedBooleanText : styles.booleanText}>True/False</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.label, {marginTop: 20}]}>Options:</Text>
              <View style={styles.optionList}>
                <TouchableOpacity style={styles.optionButton} disabled>
                  <View style={styles.optionCircle} />
                  <Text style={styles.optionText}>{booleanType === 'yesno' ? 'Yes' : 'True'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionButton} disabled>
                  <View style={styles.optionCircle} />
                  <Text style={styles.optionText}>{booleanType === 'yesno' ? 'No' : 'False'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        if (pollType === 'rating') {
          return (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Rating Scale (1 to ?):</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter max rating (e.g., 5)"
                keyboardType="numeric"
                value={options[0]}
                onChangeText={(text) => updateOption(text, 0)}
              />
            </View>
          );
        }

        if (pollType === 'likert') {
          return (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Likert Scale:</Text>
              <Text style={styles.likertDescription}>
                Strongly Disagree – Disagree – Neutral – Agree – Strongly Agree
              </Text>
              <View style={styles.optionList}>
                {['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((item, index) => (
                  <TouchableOpacity key={index} style={styles.optionButton} disabled>
                    <View style={styles.optionCircle} />
                    <Text style={styles.optionText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }

        // Default (multiple)
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Poll Options:</Text>
            <View style={styles.optionList}>
              {options.map((option, index) => (
                <View key={index} style={styles.optionContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.optionInput}
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChangeText={(text) => updateOption(text, index)}
                    />
                    {options.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(index)} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={20} color="red" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
            {options.length < 5 && (
              <TouchableOpacity onPress={addOption} style={styles.addOptionButton}>
                <Text style={styles.addOptionText}>+ Add Option</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Poll Duration:</Text>
            <View style={styles.durationContainer}>
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
            <Text style={styles.reviewTitle}>Review</Text>
            <View style={styles.pollContainer}>
              <View style={styles.pollHeader}>
                <View style={styles.creatorContainer}>
                  <Image source={require('./../../assets/images/default.png')} style={styles.profilePic} />
                  <Text style={styles.creatorName}>You</Text>
                </View>
                <View style={styles.voteCountContainer}>
                  <Text style={styles.voteCountText}>0 Votes</Text>
                </View>
              </View>
              <Text style={styles.pollTitle}>{pollTitle}</Text>
              {pollDescription ? <Text style={styles.pollDescription}>{pollDescription}</Text> : null}
              <Text style={styles.pollDuration}>
                Ends in: {duration.value} {duration.unit}
              </Text>
              <View style={styles.optionList}>
                {pollType === 'boolean' ? (
                  <>
                    <TouchableOpacity style={styles.optionButton} disabled>
                      <View style={styles.optionCircle} />
                      <Text style={styles.optionText}>{booleanType === 'yesno' ? 'Yes' : 'True'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.optionButton} disabled>
                      <View style={styles.optionCircle} />
                      <Text style={styles.optionText}>{booleanType === 'yesno' ? 'No' : 'False'}</Text>
                    </TouchableOpacity>
                  </>
                ) : pollType === 'likert' ? (
                  ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'].map((item, index) => (
                    <TouchableOpacity key={index} style={styles.optionButton} disabled>
                      <View style={styles.optionCircle} />
                      <Text style={styles.optionText}>{item}</Text>
                    </TouchableOpacity>
                  ))
                ) : pollType === 'rating' ? (
                  Array.from({ length: parseInt(options[0]) || 0 }, (_, i) => (
                    <TouchableOpacity key={i} style={styles.optionButton} disabled>
                      <View style={styles.optionCircle} />
                      <Text style={styles.optionText}>{i + 1}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  options.map((option, index) => (
                    <TouchableOpacity key={index} style={styles.optionButton} disabled>
                      <View style={styles.optionCircle} />
                      <Text style={styles.optionText}>{option}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
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
            if (!(step === 4 && isLoading)) router.back();
          }}
          style={{ padding: 10, opacity: step === 4 && isLoading ? 0.5 : 1 }}
          disabled={step === 4 && isLoading}
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
      style={[styles.navButton, styles.prevButton, step === 4 && isLoading && styles.disabledButton]}
      disabled={step === 4 && isLoading}
    >
      <Text style={styles.buttonText}>Previous</Text>
    </TouchableOpacity>
  )}
  {step < totalSteps ? (
    <TouchableOpacity 
      onPress={nextStep} 
      style={[
        styles.navButton, 
        styles.nextButton,
        step > 1 ? styles.halfWidth : styles.fullWidth
      ]}
    >
      <Text style={styles.nextbuttonText}>Next</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity 
      onPress={submitPoll} 
      style={[
        styles.navButton, 
        styles.submitButton,
        step > 1 ? styles.halfWidth : styles.fullWidth
      ]} 
      disabled={isLoading}
    >
      <Text style={styles.nextbuttonText}>{isLoading ? 'Submitting...' : 'Submit'}</Text>
    </TouchableOpacity>
  )}
</View>
    </View>
  );
};

const styles = {
  container: { 
    flex: 1, 
    backgroundColor: colors.LIGHT, 
    padding: 20 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  headerText: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginLeft: 10 
  },
  content: {
    flexGrow: 1,
    paddingBottom: 20
  },
  stepperContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 20 
  },
  step: { 
    width: 10, 
    height: 10, 
    borderRadius: 10, 
    backgroundColor: 'gray', 
    marginHorizontal: 5 
  },
  activeStep: { 
    backgroundColor: colors.BLUE 
  },
  inputContainer: { 
    width: '100%', 
    paddingHorizontal: 10 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 10, 
    color: colors.DARK 
  },
  input: { 
    borderWidth: 1, 
    borderColor: colors.GRAY, 
    borderRadius: 10, 
    padding: 15, 
    fontSize: 16, 
    backgroundColor: 'white', 
    marginBottom: 20 
  },
  multilineInput: { 
    textAlignVertical: 'top', 
    minHeight: 100 
  },
  pickerWrapper: {
  backgroundColor: 'white',
  borderRadius: 10,
  marginBottom: 20,
  elevation: 3,
  overflow: 'hidden', // important for borderRadius
},

picker: {
  height: 50, // ensure it has height
  width: '100%',
},

  booleanTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  booleanTypeButton: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.GRAY,
    alignItems: 'center',
    backgroundColor: 'white'
  },
  selectedBooleanType: {
    backgroundColor: colors.BLUE,
    borderColor: colors.BLUE
  },
  booleanText: {
    color: colors.DARK
  },
  selectedBooleanText: {
    color: 'white'
  },
  optionList: {
    marginBottom: 15
  },
  optionContainer: {
    marginBottom: 10
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.GRAY,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10
  },
  optionInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 15
  },
  deleteButton: {
    padding: 5
  },
  addOptionButton: {
    padding: 15,
    alignItems: 'center'
  },
  addOptionText: {
    color: colors.BLUE,
    fontWeight: '600'
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  durationInput: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.GRAY,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white'
  },
  durationPicker: {
    width: '48%',
    borderWidth: 1,
    borderColor: colors.GRAY,
    borderRadius: 10,
    backgroundColor: 'white'
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 15,
    textAlign: 'center'
  },
  pollContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  pollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profilePic: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginRight: 10
  },
  creatorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.GRAY
  },
  voteCountContainer: {
    backgroundColor: colors.BLUE,
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    minWidth: 80,
    alignItems: 'center'
  },
  voteCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.DARK
  },
  pollDescription: {
    fontSize: 14,
    color: colors.GRAY,
    marginBottom: 10
  },
  pollDuration: {
    fontSize: 14,
    color: colors.BLUE,
    marginBottom: 10,
    fontWeight: '600'
  },
  pollTypeText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
    color: colors.DARK
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.LIGHT_GRAY
  },
  optionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.DARK,
    marginRight: 15
  },
  optionText: {
    fontSize: 16,
    color: colors.DARK
  },
  likertDescription: {
    fontSize: 14,
    color: colors.GRAY,
    marginBottom: 15,
    textAlign: 'center'
  },
  buttonContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10
},
navButton: {
  padding: 15,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center'
},
prevButton: {
  backgroundColor: colors.GRAY
},
nextButton: {
  backgroundColor: colors.BLUE
},
submitButton: {
  backgroundColor: colors.BLUE
},
halfWidth: {
  width: '48%'
},
fullWidth: {
  width: '100%'
},
disabledButton: {
  opacity: 0.5
},
buttonText: {
  color: 'black',
  fontSize: 16,
  fontWeight: '400',
},
nextbuttonText: {
  color: 'white',
  fontSize: 16,
  fontWeight: '500',
},

};