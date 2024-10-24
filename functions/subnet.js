class IPSubnet {

    static regExpIPv4groups = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    static regExpIPv6groups = /^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/i;

    // The item index on the array is used as the CIDR number
    // 0.0.0.0 => /0  ||  255.255.255.255 => /32
    static IPv4Netmasks = [
        "0.0.0.0", "128.0.0.0", "192.0.0.0", "224.0.0.0", "240.0.0.0",
        "248.0.0.0", "252.0.0.0", "254.0.0.0", "255.0.0.0", "255.128.0.0",
        "255.192.0.0", "255.224.0.0", "255.240.0.0", "255.248.0.0",
        "255.252.0.0", "255.254.0.0", "255.255.0.0", "255.255.128.0",
        "255.255.192.0", "255.255.224.0", "255.255.240.0", "255.255.248.0",
        "255.255.252.0", "255.255.254.0", "255.255.255.0", "255.255.255.128",
        "255.255.255.192", "255.255.255.224", "255.255.255.240",
        "255.255.255.248", "255.255.255.252", "255.255.255.254",
        "255.255.255.255"
    ];


    static numberSciNotationToString(totalHosts) {
        // If the absolute value of 'totalHosts' is less than 1, process the number in scientific notation format.
        if (Math.abs(totalHosts) < 1) {
            // Extract the exponent from the scientific notation (if it exists).
            let exponent = parseInt(totalHosts.toString().split("e-")[1]);
            // If there is an exponent, multiply 'totalHosts' by 10 raised to the (exponent - 1) power and format it as a string with leading zeros.
            if (exponent) {
                totalHosts *= Math.pow(10, exponent - 1);
                totalHosts = "0." + new Array(exponent).join("0") + totalHosts.toString().substring(2);
            }
        } else {
            // If 'totalHosts' is greater than or equal to 1, handle large numbers in scientific notation.
            let exponent = parseInt(totalHosts.toString().split("+")[1]);
            // If the exponent is greater than 20, adjust the number by dividing 'totalHosts' by 10^exponent
            // and then add the appropriate number of trailing zeros.
            if (exponent > 20) {
                exponent -= 20;
                totalHosts /= Math.pow(10, exponent);
                totalHosts += new Array(exponent + 1).join("0");
            }
        }
        return totalHosts;
    }

    static trimWhitespace(input) {
        // Replace multiple spaces with a single space
        input = input.replace(/\s+/g, " ");
        return input.trim();
    }

    /* CIDR calculations may return a float, we must calculate a realistic value. Works for IPv4 and IPv6 */
    static getRealisticHostsInNetwork(t) {
        t = t.toString();
        let x = t.split(".");
        let x1 = x[0];
        let x2 = x.length > 1 ? "." + x[1] : "";
        let r = /(\d+)(\d{3})/;
        while (r.test(x1)) {
            x1 = x1.replace(r, "$1,$2");
        }
        return x1 + x2;
    }

    static getIPVersion(value) {
        if (IPSubnet.isValidIPv4(value)) {
            return "ipv4";
        }
        if (IPSubnet.isValidIPv6(value)) {
            return "ipv6";
        }
        return "invalid";
    }

    static getMaskForIPv4(value) {
        const segments = value.match(IPSubnet.regExpIPv4groups);
        let finalNetmask = "";
        for (let i = 1; i < 5; i++) {
            let segment = parseInt(segments[i]);
            // Calculate the wildcard mask segment by subtracting from 255
            finalNetmask += 255 - segment;
            // Add a dot separator if it's not the last segment
            if (i < 4) {
                finalNetmask += ".";
            }
        }
        return finalNetmask;
    }

    static getMaskForIPv4HostRequest(value) {
        const requestedHosts = parseInt(value);
        if (requestedHosts > 65534) {
            return undefined; // No usable subnet can accommodate more than 65534 hosts
        } else if (requestedHosts > 32766) {
            return 16;
        } else if (requestedHosts > 16382) {
            return 17;
        } else if (requestedHosts > 8190) {
            return 18;
        } else if (requestedHosts > 4094) {
            return 19;
        } else if (requestedHosts > 2046) {
            return 20;
        } else if (requestedHosts > 1022) {
            return 21;
        } else if (requestedHosts > 510) {
            return 22;
        } else if (requestedHosts > 254) {
            return 23;
        } else if (requestedHosts > 126) {
            return 24;
        } else if (requestedHosts > 62) {
            return 25;
        } else if (requestedHosts > 30) {
            return 26;
        } else if (requestedHosts > 14) {
            return 27;
        } else if (requestedHosts > 6) {
            return 28;
        } else if (requestedHosts > 2) {
            return 29;
        } else if (requestedHosts > 1) {
            return 30;
        } else {
            return undefined;
        }
    }

    static getIPv4NetworkAddresses(inputIP, netmask) {
        const result = {
            networkIP: "",
            broadcastIP: "",
            hostRangeStart: "",
            hostRangeEnd: ""
        }
        const netmaskSegments = netmask.match(IPSubnet.regExpIPv4groups);
        const inputIPSegments = inputIP.match(IPSubnet.regExpIPv4groups);
        for (let i = 1; i < 5; i++) {
            let s = 0;
            let segment = parseInt(inputIPSegments[i]);
            if (netmaskSegments[i] === 255) {
                result.networkIP += segment;
                result.hostRangeStart += segment;
                result.broadcastIP += segment;
                result.hostRangeEnd += segment;
            } else {
                s = 256 - netmaskSegments[i];
                for (let o = 0; o < 256; o += s) {
                    if (segment >= o && segment < o + s) {
                        result.networkIP += o;
                        result.broadcastIP += o + s - 1;
                        if (i === 4) {
                            result.hostRangeStart += o + 1;
                            result.hostRangeEnd += o + s - 2;
                        } else {
                            result.hostRangeStart += o;
                            result.hostRangeEnd += o + s - 1;
                        }
                        break;
                    }
                }
            }
            if (i < 4) {
                result.networkIP += ".";
                result.broadcastIP += ".";
                result.hostRangeStart += ".";
                result.hostRangeEnd += ".";
            }
        }
        return result;
    }

    static isValidIPv4(value) {
        const segments = value.match(IPSubnet.regExpIPv4groups);
        if (segments == null) {
            return false;
        }
        return segments.slice(1).every(segment => segment >= 0 && segment <= 255);
    }

    static isValidIPv4SubnetMask(value) {
        // CIDR notation
        if (IPSubnet.isIPv4CIDRSubnetMask(value)) {
            return true;
        }
        // Standard netmask
        let segments = value.match(IPSubnet.regExpIPv4groups);
        if (segments == null) {
            return false;
        }
        for (let i = 1; i < 5; i++) {
            let segmnet = parseInt(segments[i]);
            if (i > 2 && parseInt(segments[i - 1]) < segmnet) {
                return false;
            }
            if (![255, 254, 252, 248, 240, 224, 192, 128, 0].includes(segmnet)) {
                return false;
            }
        }
        return true;
    }

    static isIPv4WildcardSubnetMask(value) {
        value += "";
        const segments = value.match(IPSubnet.regExpIPv4groups);
        if (segments == null) {
            return false;
        }
        for (let i = 1; i < 5; i++) {
            let segment = parseInt(segments[i]);
            if (i === 1 && segment !== 0) {
                return false;
            }
            if (i > 2 && parseInt(segments[i - 1]) > segment) {
                return false;
            }
            if (![255, 127, 63, 31, 15, 7, 3, 1, 0].includes(segment)) {
                return false;
            }
        }
        return true;
    }

    static isIPv4CIDRSubnetMask(value) {
        return value > 0 && value < 33;
    }

    static IPv4NetmaskToCIDR(value) {
        // Find the index of the netmask in the array
        const index = IPSubnet.IPv4Netmasks.indexOf(value);
        return index !== -1 ? index : undefined;
    }

    static IPv4CIDRtoNetmask(value) {
        // Find the value for a given CIDR (index in the array)
        return IPSubnet.IPv4Netmasks[value] !== undefined ? IPSubnet.IPv4Netmasks[value] : undefined;
    }

    static getIPv4Class(value) {
        let segments = value.match(IPSubnet.regExpIPv4groups);
        const firstSegment = segments[1];
        if (firstSegment >= 0 && firstSegment < 128) {
            return "A (0.0.0.0 - 127.255.255.255)";
        } else if (firstSegment >= 128 && firstSegment < 192) {
            return "B (128.0.0.0 - 191.255.255.255)";
        } else if (firstSegment >= 192 && firstSegment < 224) {
            return "C (192.0.0.0 - 223.255.255.255)";
        } else if (firstSegment >= 224 && firstSegment < 240) {
            return "D (224.0.0.0 - 239.255.255.255)";
        } else if (firstSegment >= 240 && firstSegment < 256) {
            return "E (240.0.0.0 - 255.255.255.255)";
        } else {
            return "";
        }
    }

    static getTotalHostsInIPv4Network(CIDRMask) {
        return Math.pow(2, 32 - CIDRMask);
    }

    static getIPv4PreviousNetworkIP(networkIP, netmask) {
        let networkIPSegments = networkIP.match(IPSubnet.regExpIPv4groups);
        let seg1 = parseInt(networkIPSegments[1]);
        let seg2 = parseInt(networkIPSegments[2]);
        let seg3 = parseInt(networkIPSegments[3]);
        let seg4 = parseInt(networkIPSegments[4]);
        if (seg4 === 0) {
            if (seg3 === 0) {
                if (seg2 === 0) {
                    if (seg1 !== 0) {
                        seg4 = 255;
                        seg3 = 255;
                        seg2 = 255;
                        seg1 -= 1;
                    }
                } else {
                    seg4 = 255;
                    seg3 = 255;
                    seg2 -= 1;
                }
            } else {
                seg4 = 255;
                seg3 -= 1;
            }
        } else {
            seg4 -= 1;
        }
        return [seg1 + "." + seg2 + "." + seg3 + "." + seg4, netmask];
    }

    static getIPv4NextNetworkIP(broadcastIP, netmask) {
        const broadcastIPSegments = broadcastIP.match(IPSubnet.regExpIPv4groups);
        let seg1 = parseInt(broadcastIPSegments[1]);
        let seg2 = parseInt(broadcastIPSegments[2]);
        let seg3 = parseInt(broadcastIPSegments[3]);
        let seg4 = parseInt(broadcastIPSegments[4]);
        if (seg4 === 255) {
            if (seg3 === 255) {
                if (seg2 === 255) {
                    if (seg1 !== 255) {
                        seg4 = 0;
                        seg3 = 0;
                        seg2 = 0;
                        seg1 += 1;
                    }
                } else {
                    seg4 = 0;
                    seg3 = 0;
                    seg2 += 1;
                }
            } else {
                seg4 = 0;
                seg3 += 1;
            }
        } else {
            seg4 += 1;
        }
        return [seg1 + "." + seg2 + "." + seg3 + "." + seg4, netmask];
    }

    static getTotalHostsInIPv6Network(CIDRMask) {
        return Math.pow(2, 128 - CIDRMask); // May return numbers in scientific notation
    }

    static convertIPv4toBinary(address) {
        let binary = "";
        const segments = address.match(IPSubnet.regExpIPv4groups);
        for (let i = 1; i < 5; i++) {
            let segment = parseInt(segments[i]);
            binary += segment === 0 ? "00000000" : segment.toString(2);
            if (i < 4) {
                binary += ".";
            }
        }
        return binary;
    }

    static getIPv6RangeFirstHost(networkPrefix, expandedAddress) {
        let result = "";

        const processChar = (mask, char) => {
            const currentValue = parseInt(char, 16); // Parse from expandedAddress as hexadecimal
            const andResult = mask & currentValue; // Perform bitwise AND
            return andResult.toString(16).toUpperCase(); // Convert result back to hexadecimal
        }

        for (let i = 0; i < networkPrefix.length; i++) {
            let currentChar = networkPrefix.charAt(i);
            if (currentChar === ":") {
                result += ":";
            } else if (currentChar === "F") {
                result += expandedAddress.charAt(i);
            } else if (currentChar === "E") {
                // If the character is 'E', perform a bitwise AND with 14 (0xE)
                result += processChar(14, expandedAddress.charAt(i));
            } else if (currentChar === "C") {
                // If the character is 'C', perform a bitwise AND with 12 (0xC)
                result += processChar(12, expandedAddress.charAt(i));
            } else if (currentChar === "8") {
                // If the character is '8', perform a bitwise AND with 8 (0x8)
                result += processChar(8, expandedAddress.charAt(i));
            } else if (currentChar === "0") {
                // If the character is '0', just append '0' to the result
                result += "0";
            }
        }

        return result; // Return the final processed result
    }

    static getIPv6RangeLastHost(networkPrefix, firstHost, expandedAddress) {
        let result = "";

        const processChar = (increment, char) => {
            const a = parseInt(char, 16); // Parse the corresponding character in firstHost as hexadecimal
            const s = a + increment; // Increment it by x
            return s.toString().toUpperCase();
        }

        for (let i = 0; i < networkPrefix.length; i++) {
            const currentChar = networkPrefix.charAt(i); // Get the current character from networkPrefix
            if (currentChar === ":") {
                result += ":";
            } else if (currentChar === "F") {
                // If the character is 'F', append the corresponding character from expandedAddress
                result += expandedAddress.charAt(i);
            } else if (currentChar === "E") {
                // If the character is 'E', increment the corresponding value from firstHost by 1
                result += processChar(1, firstHost.charAt(i));
            } else if (currentChar === "C") {
                // If the character is 'C', increment the corresponding value from firstHost by 3
                result += processChar(3, firstHost.charAt(i));
            } else if (currentChar === "8") {
                // If the character is '8', increment the corresponding value from firstHost by 7
                result += processChar(7, firstHost.charAt(i));
            } else if (currentChar === "0") {
                // If the character is '0', append 'F' to the result
                result += "F"; // This means we are handling the maximum value for that segment
            }
        }

        return result;
    }

    static getIPv6SubnetPrefixSubnetted(inputSubSubnetAsHex, networkPrefixAddress, expandedAddress) {
        let result = ""; // Initialize an empty result string.
        for (let i = 0; i < inputSubSubnetAsHex.length; i++) {
            if (inputSubSubnetAsHex.charAt(i) === ":") {
                result += ":";
            }
            // If both the current characters in inputSubSubnetAsHex and networkPrefixAddress are 'F', append the corresponding character from expandedAddress.
            else if (inputSubSubnetAsHex.charAt(i) === "F" && networkPrefixAddress.charAt(i) === "F") {
                result += expandedAddress.charAt(i);
            }
            // If the current character in inputSubSubnetAsHex is 'F' and in networkPrefixAddress is '0', append "<strong>s</strong>" to the result.
            else if (inputSubSubnetAsHex.charAt(i) === "F" && networkPrefixAddress.charAt(i) === "0") {
                result += "<strong>s</strong>";
            }
            // If both the current characters in inputSubSubnetAsHex and networkPrefixAddress are '0', append "h" to the result.
            else if (inputSubSubnetAsHex.charAt(i) === "0" && networkPrefixAddress.charAt(i) === "0") {
                result += "h";
            } else {
                result += "?"; // undefined conditions.
            }
        }
        return result;
    }

    static convertIPv6MaskToHexadecimal(mask) {
        // Input variable: t (expected to be in the range 1 to 128)
        let r = mask;
        let binaryString = ""; // To hold the binary representation
        let hexString = ""; // To hold the final hexadecimal representation

        // Create a binary string of length 128
        for (let i = 1; i < 129; i++) {
            binaryString += i <= r ? "1" : "0"; // Add '1' if i <= r, else '0'
            if (i % 4 === 0) { // After every 4 bits, add a colon
                binaryString += ":";
            }
        }

        // Split the binary string into segments of 4 bits each
        const binarySegments = binaryString.split(":");

        // Convert each 4-bit segment to its hexadecimal representation
        for (let i = 0; i < binarySegments.length; i++) {
            // Convert 4-bit binary segments to hexadecimal characters
            if (binarySegments[i] === "0000") {
                hexString += "0";
            } else if (binarySegments[i] === "1000") {
                hexString += "8";
            } else if (binarySegments[i] === "1100") {
                hexString += "C";
            } else if (binarySegments[i] === "1110") {
                hexString += "E";
            } else if (binarySegments[i] === "1111") {
                hexString += "F";
            }

            // Add a colon after every 4 segments, except the last two segments
            const nextSegmentIndex = i + 1;
            if (i < binarySegments.length - 2 && nextSegmentIndex % 4 === 0) {
                hexString += ":";
            }
        }

        return hexString;
    }

    static isValidIPv6SubnetMask(value) {
        return value > 0 && value < 129;
    }

    static subnetworkIsGreaterThanNetPrefixAndValid(input, inputMask) {
        let inputAsInt = parseInt(input);
        let inputMaskAsInt = parseInt(inputMask);
        return inputAsInt > inputMaskAsInt && IPSubnet.isValidIPv6SubnetMask(input);
    }

    /*
     * IPv6 with Embedded IPv4
     * IPv6 can sometimes include an embedded IPv4 address in its last segment (e.g., ::ffff:192.168.1.1).
     * This function handles such cases by detecting and converting the IPv4 part into hexadecimal format as required in the IPv6 notation.
     */
    static IPV6ConvertEmbededIPv4(address) {
        const segments = address.split(":");
        const lastSegment = segments.pop();
        if (lastSegment === "") {
            // In case the IP ends with ::
            return [...segments, lastSegment].join(":");
        }
        let result = "";
        if (IPSubnet.isValidIPv4(lastSegment)) {
            let ipv4Groups = lastSegment.match(IPSubnet.regExpIPv4groups);
            let hexIPv4 = "";
            // Convert each IPv4 group (octet) to its hexadecimal representation
            for (let j = 1; j < 5; j++) {
                let decimalValue = parseInt(ipv4Groups[j]);  // Convert the group to an integer
                let hexValue = decimalValue.toString(16);  // Convert the integer to a hexadecimal string
                // Ensure that each hexadecimal value is at least 2 digits by adding a leading zero if necessary
                hexValue = hexValue.padStart(2, "0");
                hexIPv4 += hexValue;
                // Add a colon between the second and third groups of the hexadecimal representation
                if (j === 2) {
                    hexIPv4 += ":";
                }
            }
            // Append the converted IPv4 part to the result
            result += hexIPv4;
        } else {
            // Not a valid IPv4 address, just append the last segment as is
            result += lastSegment
        }
        return [...segments, result].join(":");
    }

    static IPv6Expand(address) {
        let segments = address.split(":");
        let expandedAddress = "";
        for (let i = 0; i < segments.length; i++) {
            // Check if the segment is an empty string (i.e., "::" is used for abbreviation)
            if (segments[i] === "") {
                let nextIndex = i + 1;
                // If the first segment is empty, append "0000"
                if (i === 0) {
                    expandedAddress += "0000";
                }
                // If the last segment is empty, also append "0000"
                else if (nextIndex === segments.length) {
                    expandedAddress += "0000";
                }
                // Otherwise, handle the "::" abbreviation by filling in "0000" for the missing segments
                else {
                    let missingSegments = 9 - segments.length;  // Calculate the number of missing segments

                    // Add the necessary number of "0000" segments
                    for (nextIndex = 0; nextIndex < missingSegments; nextIndex++) {
                        expandedAddress += "0000";
                        // Add a colon (":") between segments, but not after the last one
                        if (nextIndex < missingSegments - 1) {
                            expandedAddress += ":";
                        }
                    }
                }
            } else {
                // If the segment is not empty, expand / pad it to 4 digits
                expandedAddress += segments[i].padStart(4, "0");
            }
            // Add a colon between segments, but not after the last one
            if (i < segments.length - 1) {
                expandedAddress += ":";
            }
        }
        return expandedAddress.toUpperCase();
    }

    static IPv6Compress(address) {
        // This function handle some valid IPs if they have already been compressed, so you must expand them first.
        // For example, '2001::1:0:0:1428:57ab' becomes '2001:0:1::1428:57ab' and '2001:0:0:1::1428:57ab' becomes '2001::1:0:1428:57ab' when run through this function.
        // Expand the IP to avoid issues
        address = IPSubnet.IPv6Expand(address);
        // First remove the leading 0s of the octets. If it's '0000', replace with '0'
        let output = address.split(":").map(terms => terms.replace(/\b0+/g, "") || "0").join(":");
        // Then search for all occurrences of continuous '0' octets
        let zeros = [...output.matchAll(/\b:?(?:0+:?){2,}/g)];
        // If there are occurences, see which is the longest one and replace it with '::'
        if (zeros.length > 0) {
            let max = "";
            zeros.forEach(item => {
                if (item[0].replaceAll(":", "").length > max.replaceAll(":", "").length) {
                    max = item[0];
                }
            })
            output = output.replace(max, "::");
        }
        return output.toUpperCase();
    }

    static isValidIPv6(value) {
        if (value.match(IPSubnet.regExpIPv6groups)) {
            let segments = value.split(/:/g).length - 1;
            return !(segments > 7);
        }
        return false;
    }

    static calculateIPv4(inputIP, inputMask) {
        const result = {
            inputIP: "",
            networkIP: "",
            broadcastIP: "",
            netmask: "",
            netmaskBinary: "",
            wildcardMask: "",
            CIDR: "",
            hostRangeStart: "",
            hostRangeEnd: "",
            hostRangeTotal: "",
            hostRangeUsable: "",
            class: ""
        }
        result.inputIP = inputIP;

        if (!inputMask) {
            throw new Error("Invalid hosts requirement or missing netmask. <br>Valid number of hosts is from 2-65,000.");
        }
        if (IPSubnet.isIPv4WildcardSubnetMask(inputMask)) {
            result.netmask = IPSubnet.getMaskForIPv4(inputMask);
            inputMask = result.netmask;
        }
        if (!IPSubnet.isValidIPv4SubnetMask(inputMask)) {
            throw new Error("Invalid mask. See examples for possible values.");
        }
        if (IPSubnet.isIPv4CIDRSubnetMask(inputMask)) {
            result.CIDR = inputMask;
            result.netmask = IPSubnet.IPv4CIDRtoNetmask(inputMask);
        } else {
            result.netmask = inputMask;
            result.CIDR = IPSubnet.IPv4NetmaskToCIDR(inputMask);
        }

        result.netmaskBinary = IPSubnet.convertIPv4toBinary(result.netmask);
        result.wildcardMask = IPSubnet.getMaskForIPv4(result.netmask);
        result.class = IPSubnet.getIPv4Class(inputIP);

        // Set the ranges and counts
        result.hostRangeTotal = IPSubnet.getTotalHostsInIPv4Network(result.CIDR);
        result.hostRangeUsable = result.hostRangeTotal - 2;
        result.hostRangeTotal = IPSubnet.getRealisticHostsInNetwork(result.hostRangeTotal);
        result.hostRangeUsable = IPSubnet.getRealisticHostsInNetwork(result.hostRangeUsable);

        // Get networkIP, broadcastIP, hostRangeStart, hostRangeEnd
        const networkAddresses = IPSubnet.getIPv4NetworkAddresses(inputIP, result.netmask);
        if (result.CIDR > 30) {
            networkAddresses.hostRangeStart = "N/A";
            networkAddresses.hostRangeEnd = "N/A";
        }
        return {...result, ...networkAddresses};
    }

    static calculateIPv6(inputIP, inputMask, inputSubSubnet = undefined) {

        const result = {
            IPExpanded: "",
            IPCondensed: "",
            prefix: "",
            prefixLength: "",
            hostRangeStart: "",
            hostRangeEnd: "",
            hostRangeTotal: "",
            poolPercentage: "",
            // optional
            inputSubSubnet: null,
            networkSubnets: null,
            networkHostsTotal: null,
            subnettedSubnetPrefix: null
        };

        if (!inputMask) {
            inputMask = "128";
        }
        result.prefixLength = inputMask;

        if (!IPSubnet.isValidIPv6SubnetMask(inputMask)) {
            throw new Error("Improper CIDR notation. <br>Value should be between /1 and /128.");
        }
        if (inputSubSubnet && !IPSubnet.subnetworkIsGreaterThanNetPrefixAndValid(inputSubSubnet, inputMask)) {
            throw new Error("Improper sub-network defined. <br>Value must greater than network prefix and less than /128.");
        }

        inputIP = inputIP.toUpperCase();
        inputIP = IPSubnet.IPV6ConvertEmbededIPv4(inputIP);
        result.IPExpanded = IPSubnet.IPv6Expand(inputIP);
        result.IPCondensed = IPSubnet.IPv6Compress(inputIP);

        result.prefix = IPSubnet.convertIPv6MaskToHexadecimal(inputMask);
        result.hostRangeStart = IPSubnet.getIPv6RangeFirstHost(result.prefix, result.IPExpanded);
        result.hostRangeEnd = IPSubnet.getIPv6RangeLastHost(result.prefix, result.hostRangeStart, result.IPExpanded);

        let networkTotalHosts = IPSubnet.getTotalHostsInIPv6Network(inputMask);
        networkTotalHosts = IPSubnet.numberSciNotationToString(networkTotalHosts);
        result.hostRangeTotal = IPSubnet.getRealisticHostsInNetwork(networkTotalHosts);

        result.poolPercentage = networkTotalHosts / 3.402823669209385e38;
        result.poolPercentage = 100 * result.poolPercentage;
        if (inputMask > 26) {
            result.poolPercentage = "< 0.0000001";
        }

        if (inputSubSubnet) {
            result.inputSubSubnet = inputSubSubnet;

            let networkSubnets = Math.pow(2, inputSubSubnet - inputMask);
            networkSubnets = IPSubnet.numberSciNotationToString(networkSubnets);
            result.networkSubnets = IPSubnet.getRealisticHostsInNetwork(networkSubnets)

            let inputSubSubnetAsHex = IPSubnet.convertIPv6MaskToHexadecimal(inputSubSubnet);
            let subnettedSubnetPrefix = IPSubnet.getIPv6SubnetPrefixSubnetted(inputSubSubnetAsHex, result.prefix, result.IPExpanded);
            let networkTotalHosts = IPSubnet.getTotalHostsInIPv6Network(inputSubSubnet);
            networkTotalHosts = IPSubnet.numberSciNotationToString(networkTotalHosts);
            result.networkHostsTotal = IPSubnet.getRealisticHostsInNetwork(networkTotalHosts);
            result.subnettedSubnetPrefix = subnettedSubnetPrefix;
        }

        return result;
    }

    static calculate(input) {

        if (input === undefined) {
            throw Error("Input is missing. Examples:\n    " + this.docs.examples.join("\n    "));
        }

        const output = {
            type: "",
            result: {}
        };

        // Normalize input and grab mask+subnet
        input = input.replaceAll("/", " ");
        input = IPSubnet.trimWhitespace(input);

        // Grab the parts
        const inputParts = input.split(" ");
        let inputIP = inputParts[0];
        let inputMask = inputParts[1];

        // If the inputMask starts with a '#', it indicates a reverse mask / range expander
        //let requiredHosts;
        if (inputMask && inputMask.includes("#")) {
            inputMask = inputMask.replaceAll("#", "");
            //requiredHosts = inputMask;
            inputMask = IPSubnet.getMaskForIPv4HostRequest(inputMask);
        }

        // Deal with IP versions
        let ipVersion = IPSubnet.getIPVersion(inputIP);
        output.type = ipVersion;
        if (ipVersion === "invalid") {
            throw new Error("Invalid IP address.");
        }

        if (ipVersion === "ipv4") {
            output.result = IPSubnet.calculateIPv4(inputIP, inputMask);
            // Calculate sibling subnets

            const previous = IPSubnet.getIPv4PreviousNetworkIP(output.result.networkIP, output.result.netmask);
            const next = IPSubnet.getIPv4NextNetworkIP(output.result.broadcastIP, output.result.netmask);
            output.result.siblings = {
                previous: previous[0] + "/" + IPSubnet.IPv4NetmaskToCIDR(previous[1]),
                next: next[0] + "/" + IPSubnet.IPv4NetmaskToCIDR(next[1])
            }
        }

        if (ipVersion === "ipv6") {
            // Grab input sub-subnet from input
            let inputSubSubnet = undefined;
            if (inputParts.length > 2) {
                inputSubSubnet = inputParts[2];
            }
            output.result = IPSubnet.calculateIPv6(inputIP, inputMask, inputSubSubnet);
        }

        return output;
    }

    static docs = {
        name: "subnet",
        category: "Advanced Functions",
        syntax: [
            "subnet(\"input\")",
        ],
        description: "IPv4 / IPv6 Subnet Calculator",
        examples: [
            "subnet(\"172.31.180.150 255.255.252.0\")      // Subnet Mask",
            "subnet(\"192.168.5.219/28\")                  // CIDR Notation",
            "subnet(\"172.16.50.45 0.0.15.255\")           // Wildcard Mask",
            "subnet(\"10.40.50.60 #52\")                   // Calculates a network with 52 hosts",
            "subnet(\"2001:0db8:85a3::8a2e:0370:7334/64\") // IPv6 Prefix Mask",
            "subnet(\"2001:0db8:85a3::/48/64\")            // Subnet the /48 network into /64 networks"
        ],
        seealso: []
    }

    static prepareOutput(data) {
        const { type, result } = data;
        let output = [];
        if (type === "ipv4") {
            output.push(
                ["IP Address", result.inputIP],
                ["Netmask", result.netmask],
                ["Wildcard Mask", result.wildcardMask],
                ["Network Address", result.networkIP],
                ["CIDR", `${result.networkIP}/${result.CIDR}`],
                ["Usable Host Range", `${result.hostRangeStart} - ${result.hostRangeEnd}`],
                ["Broadcast Address", result.broadcastIP],
                ["Binary Netmask", result.netmaskBinary],
                ["Hosts", `${result.hostRangeTotal} (Usable: ${result.hostRangeUsable})`],
                ["IP Class", result.class],
                ["\\-"],
                ["Previous Network", result.siblings.previous],
                ["Next Network", result.siblings.next]
            );
        }
        if (type === "ipv6") {
            output.push(
                ["Expanded Notation", result.IPExpanded],
                ["Condensed Notation", result.IPCondensed],
                ["Prefix Length", result.prefixLength],
                ["Network Prefix with Mask", result.hostRangeStart],
                ["Prefix Address", result.prefix],
                ["Host Range", `${result.hostRangeStart} - ${result.hostRangeEnd}`],
                ["Total hosts", result.hostRangeTotal],
                ["% of total IPv6 Pool", `${result.poolPercentage}%`]
            );
            if (result.inputSubSubnet !== null) {
                output.push(
                    ["Subnetwork Prefix", result.inputSubSubnet],
                    ["Subnets in Network", result.networkSubnets],
                    ["Hosts in Network", result.networkHostsTotal],
                    ["Subnet Prefix Subnetted", result.subnettedSubnetPrefix]
                );
            }
        }
        return output;
    }

}
