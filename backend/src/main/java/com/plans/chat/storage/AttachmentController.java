package com.plans.chat.storage;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/chat/v1/attachments")
public class AttachmentController {
    private final AttachmentStorage storage;
    private final long maxFileSizeBytes;
    private final List<String> allowedMimeTypes;

    public AttachmentController(
        AttachmentStorage storage,
        @Value("${app.storage.max-file-size-bytes:52428800}") long maxFileSizeBytes,
        @Value("${app.storage.allowed-mime-types:image/jpeg,image/png,image/webp,video/mp4,video/quicktime}") List<String> allowedMimeTypes
    ) {
        this.storage = storage;
        this.maxFileSizeBytes = maxFileSizeBytes;
        this.allowedMimeTypes = allowedMimeTypes;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> upload(@RequestPart("file") MultipartFile file) throws IOException {
        if (file.getSize() <= 0 || file.getSize() > maxFileSizeBytes) {
            throw new IllegalArgumentException("Invalid file size");
        }
        String mimeType = file.getContentType() == null ? "" : file.getContentType();
        if (!allowedMimeTypes.contains(mimeType)) {
            throw new IllegalArgumentException("Unsupported file type");
        }
        StoredFile stored = storage.store(file);
        Integer width = null;
        Integer height = null;
        Integer durationSec = null;
        if (mimeType.startsWith("image/")) {
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image != null) {
                width = image.getWidth();
                height = image.getHeight();
            }
        }
        Map<String, Object> response = new HashMap<>();
        response.put("storageKey", stored.storageKey());
        response.put("publicUrl", stored.publicUrl());
        response.put("mimeType", stored.mimeType());
        response.put("sizeBytes", stored.sizeBytes());
        response.put("width", width);
        response.put("height", height);
        response.put("durationSec", durationSec);
        return response;
    }
}
