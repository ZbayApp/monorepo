echo 4.0.0-alpha.3
  if [[ "4.0.0-alpha.3" =~ [[:digit:]]+\.0\.0(-alpha.[[:digit:]]+)?$ ]]; then 
      echo "This is a major version"
  else
      echo "This is NOT a major version"
  fi
