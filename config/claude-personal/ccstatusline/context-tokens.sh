#!/usr/bin/env bash

input=$(cat)

tokens=$(printf '%s' "$input" | jq -r '
  def usage_tokens:
    if type == "number" then .
    elif type == "object" then
      ((.input_tokens // 0) +
       (.output_tokens // 0) +
       (.cache_creation_input_tokens // 0) +
       (.cache_read_input_tokens // 0))
    else empty end;

  (.context_window.current_usage | usage_tokens) //
  .context_window.total_input_tokens //
  empty
')

if [ -n "$tokens" ] && [ "$tokens" != "null" ]; then
  printf '%s tokens\n' "$tokens"
fi
