{
  description = "Trying out different solutions for implementing a GraphQL API on a server.";

  inputs = {
    flake-utils.url = github:numtide/flake-utils;

    nixpkgs.url = github:NixOS/nixpkgs/master;
  };

  outputs =
    { self
    , flake-utils
    , nixpkgs
    }:
    let
      name = "graphql-experiments";
    in
    flake-utils.lib.eachDefaultSystem (system:
    let
      pkgs = import nixpkgs { inherit system; };
    in
    rec {
      formatter = pkgs.nixpkgs-fmt;

      devShells.default = with pkgs; mkShell {
        buildInputs = [
          nodejs
        ];
      };
    }
    );
}
