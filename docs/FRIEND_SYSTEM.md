# Friend System Implementation

## Overview

The Friend System adds social features to the expense sharing service, allowing users to:
- Send and receive friend requests
- Manage friendships
- Search for users
- Get friend suggestions based on mutual connections
- Integrate friends with group creation for easier expense management

## Database Schema

### New Tables

#### `friend_requests`
Manages friend request lifecycle with statuses:
- `PENDING`: Request sent but not responded to
- `ACCEPTED`: Request accepted (friendship created)
- `DECLINED`: Request declined

```sql
CREATE TABLE "friend_requests" (
    "id" SERIAL NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id")
);
```

#### `friendships`
Stores bidirectional friendships efficiently:
- Always stores `user1Id < user2Id` for consistency
- Prevents duplicate relationships

```sql
CREATE TABLE "friendships" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user1Id" INTEGER NOT NULL,
    "user2Id" INTEGER NOT NULL,
    CONSTRAINT "friendships_pkey" PRIMARY KEY ("id")
);
```

### Database Constraints
- Unique constraint on `(senderId, receiverId)` for friend requests
- Unique constraint on `(user1Id, user2Id)` for friendships
- Cascade delete for user relationships

## API Endpoints

### Friend Requests

#### `POST /api/v1/friends/requests`
Send a friend request by email or user ID.

**Body:**
```json
{
  "email": "friend@example.com",  // OR
  "userId": 123,
  "message": "Let's be friends!"  // Optional
}
```

**Response (201):**
```json
{
  "id": 1,
  "message": "Let's be friends!",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "receiver": {
    "id": 123,
    "name": "John Doe",
    "username": "johndoe",
    "email": "friend@example.com"
  }
}
```

#### `GET /api/v1/friends/requests/sent`
Get pending friend requests sent by the authenticated user.

#### `GET /api/v1/friends/requests/received`
Get pending friend requests received by the authenticated user.

#### `PATCH /api/v1/friends/requests/:id`
Accept or decline a friend request.

**Body:**
```json
{
  "accept": true  // true to accept, false to decline
}
```

#### `DELETE /api/v1/friends/requests/:id`
Cancel a sent friend request.

### Friends Management

#### `GET /api/v1/friends`
Get the authenticated user's friends list.

**Response:**
```json
{
  "friends": [
    {
      "id": 123,
      "friendshipId": 1,
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "https://example.com/avatar.jpg",
      "friendsSince": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### `DELETE /api/v1/friends/:userId`
Remove a friendship.

### Search and Discovery

#### `GET /api/v1/friends/search?q=query&limit=20`
Search for users to add as friends.

**Response:**
```json
[
  {
    "id": 123,
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "isFriend": false,
    "hasPendingRequest": false
  }
]
```

#### `GET /api/v1/friends/suggestions?limit=10`
Get friend suggestions based on mutual friends.

#### `GET /api/v1/friends/:userId/mutual`
Get mutual friends with another user.

#### `GET /api/v1/friends/:userId/status`
Check friendship status with another user.

**Response:**
```json
{
  "isFriend": false,
  "hasPendingRequest": true,
  "requestDirection": "sent"  // "sent", "received", or "none"
}
```

## Repository Functions

### Core Functions

- `sendFriendRequest(data)` - Send a friend request
- `acceptFriendRequest(requestId, userId)` - Accept request and create friendship
- `declineFriendRequest(requestId, userId)` - Decline request
- `cancelFriendRequest(requestId, userId)` - Cancel sent request
- `getUserFriends(userId)` - Get user's friends list
- `removeFriendship(user1Id, user2Id)` - Remove friendship
- `areFriends(user1Id, user2Id)` - Check if users are friends

### Search and Discovery

- `searchUsers(currentUserId, query, limit)` - Search users with friendship status
- `getFriendSuggestions(userId, limit)` - Get suggestions based on mutual friends
- `getMutualFriends(user1Id, user2Id)` - Get mutual friends between users
- `getFriendsCount(userId)` - Get total friends count

## Security Features

### Validation and Authorization
- Prevent self-friend requests
- Prevent duplicate friend requests (including reverse direction)
- Prevent friend requests to existing friends
- Only receivers can accept/decline requests
- Only senders can cancel requests
- Comprehensive input validation

### Data Protection
- User search results exclude sensitive information
- Friend status checking respects privacy
- Proper authentication required for all endpoints

## Integration with Existing Features

### Group Creation Enhancement
The friend system integrates with group management by:
- Suggesting friends when creating new groups
- Showing mutual friends in group member lists
- Enabling easier discovery of users for expense sharing

### User Profile Enhancement
Friends list and social features enhance user profiles with:
- Friend count display
- Mutual friends information
- Social activity indicators

## Database Migration

To implement the friend system, run:

```bash
# Generate migration (after updating schema)
npx prisma migrate dev --name add_friend_system

# Generate updated Prisma client
npx prisma generate
```

## Testing

Comprehensive test suites cover:

### Repository Tests (`tests/repositories/friendRepo.test.ts`)
- Friend request lifecycle (send, accept, decline, cancel)
- Friendship management (create, remove, check status)
- Search and discovery functionality
- Edge cases and error handling
- Data integrity and constraints

### API Tests (`tests/routes/friends.test.ts`)
- All endpoint functionality
- Authentication and authorization
- Input validation
- Error responses
- Integration scenarios

### Test Coverage
- Unit tests for all repository functions
- Integration tests for API endpoints
- Edge case testing for security
- Performance testing for search queries

## Performance Considerations

### Database Optimization
- Indexed foreign keys for fast lookups
- Efficient bidirectional friendship storage
- Optimized queries for mutual friends discovery
- Proper cascading deletes

### Search Performance
- Full-text search capabilities for user discovery
- Pagination support for large result sets
- Cached friend counts for quick statistics
- Efficient mutual friends queries using SQL

## Error Handling

### Validation Errors
- Invalid user IDs
- Self-friend request attempts
- Duplicate request prevention
- Authorization failures

### Business Logic Errors
- Friend request lifecycle violations
- Non-existent entity handling
- Permission checking
- Rate limiting considerations

## Future Enhancements

### Potential Features
1. **Friend Groups/Lists** - Organize friends into categories
2. **Friend Blocking** - Prevent unwanted friend requests
3. **Activity Feed** - Show friend activity in expenses
4. **Recommendation Engine** - Advanced friend suggestions
5. **Social Sharing** - Share expenses with friends
6. **Notification System** - Real-time friend request notifications

### Scalability Improvements
1. **Caching Layer** - Redis for friend lists and suggestions
2. **Background Jobs** - Async friend suggestion calculations
3. **Batch Operations** - Bulk friend management
4. **API Rate Limiting** - Prevent abuse of social features

## Usage Examples

### Basic Friend Request Flow
```javascript
// Send friend request
const request = await sendFriendRequest({
  senderId: 1,
  receiverId: 2,
  message: "Hi! Let's be friends!"
});

// Accept friend request
const friendship = await acceptFriendRequest(request.id, 2);

// Check if users are friends
const areFriends = await areFriends(1, 2); // true
```

### Friend Discovery
```javascript
// Search for users
const users = await searchUsers(1, "john", 10);

// Get friend suggestions
const suggestions = await getFriendSuggestions(1, 5);

// Get mutual friends
const mutual = await getMutualFriends(1, 2);
```

## Deployment Notes

1. **Database Migration**: Ensure proper backup before running migrations
2. **Feature Flags**: Consider gradual rollout for the friend system
3. **Monitoring**: Set up alerts for friend request volumes
4. **Privacy**: Review privacy implications of friend discovery
5. **Performance**: Monitor search query performance in production

This implementation provides a solid foundation for social features while maintaining security and performance standards. 