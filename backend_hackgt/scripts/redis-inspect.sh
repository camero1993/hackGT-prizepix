#!/bin/bash

# Redis Schema Inspector - Quick Shell Script
# Usage: ./scripts/redis-inspect.sh [pattern]

PATTERN=${1:-"demo:*"}
REDIS_HOST=${REDIS_HOST:-"localhost"}
REDIS_PORT=${REDIS_PORT:-"6379"}

echo "🔍 Redis Schema Inspector"
echo "========================"
echo "Pattern: $PATTERN"
echo "Host: $REDIS_HOST:$REDIS_PORT"
echo ""

# Check if Redis is running
if ! redis-cli -h $REDIS_HOST -p $REDIS_PORT ping > /dev/null 2>&1; then
    echo "❌ Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
    echo "   Make sure Redis is running and accessible"
    exit 1
fi

echo "✅ Connected to Redis"
echo ""

# Get all keys matching pattern
echo "📋 Keys matching pattern '$PATTERN':"
echo "===================================="
KEYS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT KEYS "$PATTERN")
if [ -z "$KEYS" ]; then
    echo "❌ No keys found"
    exit 0
fi

echo "$KEYS" | wc -l | xargs echo "Total keys:"
echo ""

# Group keys by type
echo "📊 Keys by type:"
echo "================"
for key in $KEYS; do
    TYPE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT TYPE "$key")
    echo "$key ($TYPE)"
done | sort | uniq -c | sort -nr

echo ""

# Show key patterns
echo "🔑 Key patterns:"
echo "==============="
echo "$KEYS" | sed 's/:[a-zA-Z0-9_-]*$/:*/g' | sed 's/:[a-zA-Z0-9_-]*:/:*:/g' | sort | uniq -c | sort -nr

echo ""

# Show sample data for each key type
echo "📄 Sample data:"
echo "==============="

# Hash keys
HASH_KEYS=$(echo "$KEYS" | xargs -I {} sh -c 'redis-cli -h '$REDIS_HOST' -p '$REDIS_PORT' TYPE "{}" | grep -q "hash" && echo "{}"')
if [ ! -z "$HASH_KEYS" ]; then
    echo ""
    echo "🗂️  Hash keys:"
    for key in $HASH_KEYS; do
        echo "  $key:"
        redis-cli -h $REDIS_HOST -p $REDIS_PORT HGETALL "$key" | sed 's/^/    /'
        echo ""
    done
fi

# Set keys
SET_KEYS=$(echo "$KEYS" | xargs -I {} sh -c 'redis-cli -h '$REDIS_HOST' -p '$REDIS_PORT' TYPE "{}" | grep -q "set" && echo "{}"')
if [ ! -z "$SET_KEYS" ]; then
    echo ""
    echo "📦 Set keys:"
    for key in $SET_KEYS; do
        echo "  $key:"
        redis-cli -h $REDIS_HOST -p $REDIS_PORT SMEMBERS "$key" | head -5 | sed 's/^/    /'
        echo ""
    done
fi

# List keys
LIST_KEYS=$(echo "$KEYS" | xargs -I {} sh -c 'redis-cli -h '$REDIS_HOST' -p '$REDIS_PORT' TYPE "{}" | grep -q "list" && echo "{}"')
if [ ! -z "$LIST_KEYS" ]; then
    echo ""
    echo "📝 List keys:"
    for key in $LIST_KEYS; do
        LEN=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT LLEN "$key")
        echo "  $key (length: $LEN):"
        redis-cli -h $REDIS_HOST -p $REDIS_PORT LRANGE "$key" 0 4 | sed 's/^/    /'
        echo ""
    done
fi

# Sorted set keys
ZSET_KEYS=$(echo "$KEYS" | xargs -I {} sh -c 'redis-cli -h '$REDIS_HOST' -p '$REDIS_PORT' TYPE "{}" | grep -q "zset" && echo "{}"')
if [ ! -z "$ZSET_KEYS" ]; then
    echo ""
    echo "📈 Sorted set keys:"
    for key in $ZSET_KEYS; do
        CARD=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT ZCARD "$key")
        echo "  $key (cardinality: $CARD):"
        redis-cli -h $REDIS_HOST -p $REDIS_PORT ZRANGE "$key" 0 4 WITHSCORES | sed 's/^/    /'
        echo ""
    done
fi

echo "✅ Inspection complete!"
