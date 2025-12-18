#!/bin/bash

# Script to add authentication to remaining conversation tests

FILE="./src/routes/conversations.test.ts"

# Pattern 1: Add auth headers to remaining POST /conversations tests
sed -i.bak 's/const user1 = await createUser('\''User 1'\'', '\''user1'\'')/const { chatUser: user1, headers: user1Headers } = await createAuthUserWithChatUser('\''user1'\'', '\''user1@test.com'\'')/g' "$FILE"

# Pattern 2: Add auth headers to POST requests in remaining tests where user1 is the requester
sed -i.bak "s/method: 'POST',$/&\n        headers: { ...user1Headers, 'Content-Type': 'application\/json' },/g" "$FILE"

echo "Conversion done. Review the changes and run tests."
