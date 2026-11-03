import re

with open('src/screens/onboarding/OnboardingScreen.js', 'r') as f:
    content = f.read()

# Fix the first ternary operator - move : null to new line
content = content.replace(
    '</TouchableOpacity> : null)',
    '</TouchableOpacity>\n          ) : null}'
)

# Fix the second ternary operator
content = content.replace(
    '</TouchableOpacity> : null)',
    '</TouchableOpacity>\n          ) : null}'
)

with open('src/screens/onboarding/OnboardingScreen.js', 'w') as f:
    f.write(content)

print('Done')
